# LAN-IOT Signer (POC)

A minimal Certificate Authority (CA) signer service for IoT devices. Generates SSL certificates for ESP32-S3 devices by signing with an intermediate certificate.

## Quick Start

### Local Development
```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.example .env
# Edit .env with your values

# 3. Run the server
npm start
```

### Environment Variables
Configure these in `.env` (local) or in your hosting platform:
- `SIGNER_TOKEN` - Bearer token for API authentication
- `DEV_INT_CRT` - Intermediate certificate (file path or PEM content)
- `DEV_INT_KEY` - Intermediate private key (file path or PEM content)
- `PORT` - Server port (optional, defaults to 8080)
- `ALLOW_PRIVATE_IPS` - Allow private IPs (optional, defaults to true)
- `DEFAULT_DAYS` - Default cert validity in days (optional, defaults to 7)

Note: Certificates support multiple formats (PEM, base64-PEM, base64-DER)

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed setup instructions including Railway deployment.

## API Endpoint

### Sign Certificate Request

```
POST /v1/sign
Authorization: Bearer $SIGNER_TOKEN
Content-Type: application/json
```

**Request Body:**
```json
{
  "device_id": "LAN-IOT-12AB",
  "ip": "192.168.7.189",
  "dns": "LAN-IOT-12AB.local",
  "days": 7
}
```

**Response:**
```json
{
  "device_key_pem": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "server_crt_pem": "-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----\n"
}
```

Returns both the device private key and certificate chain (leaf + intermediate).

## Device Usage (ESP32-S3)

1. **Save the returned keys:**
   - `device_key_pem` → `/device.key`
   - `server_crt_pem` → `/server.crt`

2. **Keep your root CA certificate** at `/ca.crt` to distribute to clients

3. **Load certificates in your ESP32-S3 code:**
   ```cpp
   // Read /server.crt and /device.key into strings
   sslCert = new SSLCert((const unsigned char*)crt.data(), crt.size(),
                         (const unsigned char*)key.data(), key.size());
   ```

## Hardening Notes

- **Keep certificate lifetime short** (1–7 days). Re-issue on IP change.
- **Restrict tokens per device**. Add an allowlist mapping `device_id` → token.
- **Move intermediate key into an HSM/KMS** when you leave POC stage.