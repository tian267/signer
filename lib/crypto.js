import { mkdtemp, rm, readFile, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { randomBytes } from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";
const execFileP = promisify(execFile);

async function normalizeAndWriteCertKey(content, filePath, type = 'cert') {
  // Normalize certificate/key content from various secret formats
  let normalized = content.trim().replace(/^\uFEFF/, ""); // Remove BOM
  
  // Unescape literal newlines and quotes that often appear in secrets
  normalized = normalized.replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n").replace(/\\r/g, "");
  normalized = normalized.replace(/^["']|["']$/g, ""); // Remove surrounding quotes
  
  // Check if this is a file path instead of content - be very specific to avoid false positives
  if (!normalized.includes('://') && !normalized.includes('-----BEGIN') && 
      (normalized.startsWith('/') || normalized.startsWith('./') || normalized.startsWith('../') || 
       /^[A-Za-z]:\\/.test(normalized)) && /\.(crt|pem|cer|der|key|p12|pfx|p7b|p7c)$/i.test(normalized)) {
    console.log(`Reading ${type} from file path: ${normalized}`);
    try {
      const fileContent = await readFile(normalized, 'utf8');
      normalized = fileContent.trim();
    } catch (e) {
      throw new Error(`Cannot read ${type} file '${normalized}': ${e.message}`);
    }
  }
  
  
  if (normalized.includes("-----BEGIN ")) {
    // Already PEM format, but might need line break fixes
    // Insert newlines after headers and before footers, and ensure 64-char lines
    let fixedPem = normalized;
    
    // Fix common line break issues in PEM content
    fixedPem = fixedPem.replace(/-----BEGIN ([^-]+)-----\s*/g, '-----BEGIN $1-----\n');
    fixedPem = fixedPem.replace(/\s*-----END ([^-]+)-----/g, '\n-----END $1-----');
    
    // Ensure the base64 content has proper line breaks (64 chars per line)
    const lines = fixedPem.split('\n');
    const fixedLines = [];
    
    for (const line of lines) {
      if (line.startsWith('-----') || line.trim() === '') {
        fixedLines.push(line);
      } else {
        // Break long base64 lines into 64-character chunks
        const cleanLine = line.replace(/\s/g, '');
        for (let i = 0; i < cleanLine.length; i += 64) {
          fixedLines.push(cleanLine.substr(i, 64));
        }
      }
    }
    
    await writeFile(filePath, fixedLines.join('\n') + '\n');
  } else {
    // Try base64 decode - could be base64-encoded PEM or DER
    try {
      // Handle base64url encoding (convert to standard base64)
      let base64Content = normalized.replace(/\s/g, "").replace(/-/g, '+').replace(/_/g, '/');
      // Add padding if needed
      while (base64Content.length % 4) {
        base64Content += '=';
      }
      
      const decoded = Buffer.from(base64Content, 'base64');
      const decodedText = decoded.toString('utf8');
      
      if (decodedText.includes("-----BEGIN ")) {
        // Base64-encoded PEM
        await writeFile(filePath, decodedText + '\n');
      } else if (decoded[0] === 0x30 && (decoded[1] & 0x80) === 0x80) {
        // Looks like DER format (ASN.1 SEQUENCE), convert to PEM
        const derPath = filePath + '.der';
        await writeFile(derPath, decoded);
        
        try {
          if (type === 'cert') {
            await execFileP("openssl", ["x509", "-inform", "DER", "-in", derPath, "-out", filePath]);
          } else {
            // Try pkey first, fallback to ec, then rsa for different key types
            try {
              await execFileP("openssl", ["pkey", "-inform", "DER", "-in", derPath, "-out", filePath]);
            } catch {
              try {
                await execFileP("openssl", ["ec", "-inform", "DER", "-in", derPath, "-out", filePath]);
              } catch {
                await execFileP("openssl", ["rsa", "-inform", "DER", "-in", derPath, "-out", filePath]);
              }
            }
          }
          await rm(derPath); // Clean up temporary DER file
        } catch (e) {
          await rm(derPath); // Clean up on error
          throw new Error(`Failed to convert DER to PEM: ${e.message}`);
        }
      } else {
        throw new Error(`Invalid ${type} format: not PEM and base64 decode doesn't contain PEM headers or valid DER`);
      }
    } catch (e) {
      if (e.message.includes('Invalid character')) {
        throw new Error(`Invalid ${type} format: content is not valid base64 or PEM`);
      }
      throw new Error(`Invalid ${type} format: ${e.message}`);
    }
  }
  
  // Validate the written PEM file
  const validateCmd = type === 'cert' 
    ? ["x509", "-in", filePath, "-noout", "-subject"]
    : ["pkey", "-in", filePath, "-noout"];
  
  try {
    await execFileP("openssl", validateCmd);
  } catch (e) {
    throw new Error(`Invalid ${type} format after normalization: ${e.message}`);
  }
}

export async function signLeaf({ deviceId, ip, dns, days, devIntCrtContent, devIntKeyContent }) {
  const work = await mkdtemp(join(tmpdir(), "sign-"));
  const keyPath = join(work, "device.key");
  const csrPath = join(work, "device.csr");
  const extPath = join(work, "ext.cnf");
  const crtPath = join(work, "server.crt");
  const chainPath = join(work, "server_chain.crt");
  const intCrtPath = join(work, "intermediate.crt");
  const intKeyPath = join(work, "intermediate.key");

  // Write intermediate cert and key to temporary files with proper formatting
  await normalizeAndWriteCertKey(devIntCrtContent, intCrtPath, 'cert');
  await normalizeAndWriteCertKey(devIntKeyContent, intKeyPath, 'key');

  // Validate and escape IP and DNS to prevent config injection
  const safeIp = ip.replace(/[^\d.]/g, ''); // Only allow digits and dots for IP
  const safeDns = dns ? dns.replace(/[^a-zA-Z0-9.-]/g, '') : null; // Only allow safe hostname chars for DNS
  
  const alt = ["[alt_names]", `IP.1=${safeIp}`];
  if (safeDns && safeDns.length > 0) alt.push(`DNS.1=${safeDns}`);

  const ext = [
    "basicConstraints=CA:FALSE",
    "keyUsage=digitalSignature,keyEncipherment",
    "extendedKeyUsage=serverAuth",
    "subjectAltName=@alt_names",
    alt.join("\n")
  ].join("\n");

  await writeFile(extPath, ext);

  // 1) key
  await execFileP("openssl", ["ecparam", "-name", "prime256v1", "-genkey", "-noout", "-out", keyPath]);

  // 2) csr
  const subj = `/CN=${deviceId}`;
  await execFileP("openssl", ["req", "-new", "-key", keyPath, "-subj", subj, "-out", csrPath]);

  // 3) sign with intermediate
  const daysStr = String(days);
  await execFileP("openssl", [
    "x509", "-req", "-in", csrPath,
    "-CA", intCrtPath, "-CAkey", intKeyPath, "-CAcreateserial",
    "-out", crtPath, "-days", daysStr, "-sha256", "-extfile", extPath
  ]);

  // 4) chain
  const [leaf, inter] = await Promise.all([readFile(crtPath, "utf8"), readFile(intCrtPath, "utf8")]);
  const chain = leaf + (inter.endsWith("\n") ? inter : inter + "\n");
  await writeFile(chainPath, chain);

  const [keyPem, chainPem] = await Promise.all([readFile(keyPath, "utf8"), readFile(chainPath, "utf8")]);

  // cleanup
  await rm(work, { recursive: true, force: true });

  return { device_key_pem: keyPem, server_crt_pem: chainPem };
}