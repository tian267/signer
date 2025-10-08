# Deployment Guide

## Local Development Setup

### Prerequisites
- Node.js 20 or higher
- OpenSSL (usually pre-installed on macOS/Linux)
- Your intermediate CA certificate and private key files

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Set Up Environment Variables
1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and configure your values:
   ```bash
   # Generate a secure token
   SIGNER_TOKEN=$(openssl rand -hex 32)
   
   # For local development, you can use file paths
   DEV_INT_CRT=./certs/dev-int.crt
   DEV_INT_KEY=./certs/dev-int.key
   ```

### Step 3: Prepare Your Certificates
Make sure you have your intermediate CA certificate and private key:
- Place them in the `certs/` directory, OR
- Set the full PEM content as environment variables

Example file structure:
```
certs/
  ├── dev-int.crt    # Intermediate certificate
  ├── dev-int.key    # Intermediate private key
  └── dev-int.srl    # Serial number file (auto-generated)
```

### Step 4: Run Locally
```bash
npm start
```

The server will start on `http://localhost:8080`

### Step 5: Test the Service
```bash
# Health check
curl http://localhost:8080/healthz

# Sign a certificate (replace YOUR_TOKEN with your SIGNER_TOKEN)
curl -X POST http://localhost:8080/v1/sign \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "LAN-IOT-TEST-01",
    "ip": "192.168.1.100",
    "dns": "test-device.local",
    "days": 7
  }'
```

---

## Railway Deployment

### Step 1: Prepare Your Repository
1. Make sure your code is committed to a Git repository (GitHub, GitLab, etc.)
2. Ensure `.env` is in `.gitignore` (already configured)

### Step 2: Create a New Railway Project
1. Go to [Railway.app](https://railway.app)
2. Click "New Project"
3. Choose "Deploy from GitHub repo"
4. Select your repository

### Step 3: Configure Environment Variables in Railway
Railway will automatically detect your Node.js app. You need to set these environment variables in the Railway dashboard:

1. Go to your project in Railway
2. Click on your service
3. Go to the "Variables" tab
4. Add the following variables:

#### Required Variables:

**SIGNER_TOKEN**
```
your-secure-bearer-token-here
```
Generate a secure token with: `openssl rand -hex 32`

**DEV_INT_CRT**
```
-----BEGIN CERTIFICATE-----
[Your intermediate certificate content here]
-----END CERTIFICATE-----
```
⚠️ **Important**: For Railway, paste the FULL PEM content (including the BEGIN/END lines). The app supports multiline environment variables.

**DEV_INT_KEY**
```
-----BEGIN PRIVATE KEY-----
[Your intermediate private key content here]
-----END PRIVATE KEY-----
```
⚠️ **Important**: For Railway, paste the FULL PEM content (including the BEGIN/END lines).

#### Optional Variables:

**ALLOW_PRIVATE_IPS** (default: `true`)
```
true
```

**DEFAULT_DAYS** (default: `7`)
```
7
```

> **Note**: Railway automatically sets the `PORT` environment variable, so you don't need to configure it.

### Step 4: Deploy
1. Railway will automatically deploy your application
2. Wait for the deployment to complete
3. Railway will provide you with a public URL (e.g., `https://your-app.up.railway.app`)

### Step 5: Verify Deployment
```bash
# Health check (replace YOUR_APP_URL with your Railway URL)
curl https://your-app.up.railway.app/healthz

# Test certificate signing
curl -X POST https://your-app.up.railway.app/v1/sign \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "LAN-IOT-TEST-01",
    "ip": "192.168.1.100",
    "dns": "test-device.local",
    "days": 7
  }'
```

### Step 6: Monitor Your Service
- Railway provides logs in the "Deployments" tab
- Monitor request logs and any errors
- Set up alerts if needed

---

## Environment Variable Format Options

The application supports multiple formats for `DEV_INT_CRT` and `DEV_INT_KEY`:

### 1. File Path (Local Development)
```env
DEV_INT_CRT=./certs/dev-int.crt
DEV_INT_KEY=./certs/dev-int.key
```

### 2. Full PEM Content (Railway/Production)
```env
DEV_INT_CRT="-----BEGIN CERTIFICATE-----
MIICxjCCAa4CCQDXm...
...
-----END CERTIFICATE-----"
```

### 3. Base64-Encoded PEM
```env
DEV_INT_CRT=LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0t...
```

### 4. Base64-Encoded DER
The app will automatically convert DER format to PEM if needed.

---

## Security Best Practices

### For Production (Railway):
1. **Never commit** `.env` files or certificates to Git
2. Use Railway's **secrets** for sensitive values
3. Rotate your `SIGNER_TOKEN` regularly
4. Keep certificate lifetimes short (1-7 days)
5. Monitor API usage and set up alerts
6. Consider moving intermediate key to HSM/KMS for production use

### Rate Limiting:
- Current limit: 5 requests per minute per IP
- Adjust in `server.js` if needed for production

### IP Restrictions:
- By default, only private IPs are allowed
- Set `ALLOW_PRIVATE_IPS=false` to restrict further
- Implement device allowlisting for production

---

## Troubleshooting

### "Missing DEV_INT_CRT or DEV_INT_KEY environment variables"
- Ensure the variables are set in Railway
- Check for proper formatting (no extra quotes or escaping)

### "Invalid cert format after normalization"
- Verify your PEM content is complete
- Check that BEGIN/END lines are included
- Try base64-encoding the PEM content

### Rate Limiting Issues
- Current limit: 5 requests/minute
- Increase in `server.js` if needed
- Check Railway logs for blocked requests

### OpenSSL Errors
- Railway includes OpenSSL by default
- Check deployment logs for specific errors
- Verify certificate/key format is correct

---

## Support

For issues or questions:
- Check Railway logs in the dashboard
- Review the [Railway documentation](https://docs.railway.app)
- Check OpenSSL version: `openssl version`
