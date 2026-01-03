# Vercel Deployment Guide

This project is optimized for **Vercel Serverless** deployment with Next.js frontend and Flask backend.

## 🏗️ Architecture

- **Frontend**: Next.js (App Router) - Deployed as static/SSR pages
- **Backend**: Flask API - Deployed as serverless functions with `@vercel/python`
- **Routing**: `/api/*` → Flask, everything else → Next.js

## 📋 Pre-Deployment Checklist

### 1. Environment Variables
Before deploying, you must configure the Gemini API key:

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create an API key
3. In Vercel Dashboard → Settings → Environment Variables, add:
   ```
   GEMINI_API_KEY=your_actual_api_key_here
   ```

### 2. File Structure (Already Configured ✅)
```
/
├── api/
│   ├── index.py          # Flask entry point (REQUIRED)
│   ├── gemini.py         # AI logic
│   ├── pdfutils.py       # PDF processing
│   └── system_prompt.txt # AI instructions
├── app/                  # Next.js App Router
├── requirements.txt      # Python dependencies (root level)
├── package.json          # Node dependencies
└── vercel.json          # Vercel configuration
```

### 3. Configuration Files (Already Optimized ✅)

#### `vercel.json`
- ✅ Specifies Python runtime (`@vercel/python`)
- ✅ Configures rewrites for `/api/*` routing
- ✅ Sets function timeout (60s) and memory (1024MB)
- ✅ Disables caching for dynamic API responses

#### `api/index.py`
- ✅ Exposes Flask `app` variable (required by Vercel)
- ✅ No `app.run()` (serverless incompatible)
- ✅ Environment-aware CORS configuration

#### `next.config.ts`
- ✅ Production optimizations enabled
- ✅ Image optimization configured
- ✅ Security headers set

## 🚀 Deployment Steps

### Option 1: Deploy via Vercel Dashboard (Recommended)

1. **Connect Repository**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "Add New" → "Project"
   - Import your GitHub repository

2. **Configure Environment Variables**
   - In project settings, add `GEMINI_API_KEY`
   - Click "Save"

3. **Deploy**
   - Vercel auto-detects Next.js and Python
   - Click "Deploy"
   - Wait for build (2-5 minutes)

### Option 2: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# Add environment variable
vercel env add GEMINI_API_KEY
```

## 🧪 Testing Deployment

### Health Check
After deployment, test the API:
```bash
curl https://your-project.vercel.app/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "api_key_configured": true,
  "environment": "production"
}
```

### Test Chat Endpoint
```bash
curl -X POST https://your-project.vercel.app/api/ask \
  -H "Content-Type: application/json" \
  -d '{"query": "What is YTHS?", "history": []}'
```

## ⚠️ Important Serverless Limitations

### 1. **Cold Starts**
- First request after inactivity: 2-5 seconds delay
- Subsequent requests: Normal speed
- **Solution**: Use Vercel Pro for reduced cold starts

### 2. **Execution Timeout**
- **Free Plan**: 10 seconds max
- **Pro Plan**: 60 seconds max (configured in `vercel.json`)
- **Impact**: Long AI responses may timeout
- **Solution**: Use streaming (already implemented)

### 3. **No Persistent Storage**
- Cannot write to filesystem (ephemeral)
- Cannot store sessions in memory
- **Solution**: Use external database (Supabase, MongoDB, Upstash Redis)

### 4. **File Size Limits**
- Request body: 4.5MB (Free), 10MB (configured)
- Response: 4.5MB
- **Impact**: Large PDF uploads may fail
- **Solution**: Implement file size validation

### 5. **Environment Variables**
- `.env` files are ignored in production
- Must use Vercel Dashboard to set variables
- Changes require redeployment

## 🔧 Troubleshooting

### Build Fails with Python Error
**Cause**: Missing dependencies in `requirements.txt`  
**Solution**: Ensure all imports are listed:
```txt
flask
flask-cors
python-dotenv
google-genai
google-generativeai
pypdf
```

### API Returns 404
**Cause**: Routing misconfiguration  
**Solution**: Verify `vercel.json` rewrites match your API routes

### CORS Errors
**Cause**: Production CORS restriction  
**Solution**: Update `api/index.py` line 11 to allow your domain:
```python
CORS(app, resources={r"/api/*": {"origins": ["https://your-domain.vercel.app"]}})
```

### Cold Start Latency
**Cause**: Serverless function initialization  
**Solution**: 
- Use Vercel Pro for edge caching
- Implement loading states in frontend (already done ✅)

### Gemini API Key Not Working
**Cause**: Environment variable not set  
**Solution**:
1. Check Vercel Dashboard → Settings → Environment Variables
2. Ensure variable name is exactly `GEMINI_API_KEY`
3. Redeploy after adding variable

## 📊 Monitoring

### Vercel Analytics (Free)
- Go to project → Analytics
- Monitor:
  - Response times
  - Function invocations
  - Error rates

### Function Logs
```bash
vercel logs your-project.vercel.app
```

## 🔒 Security Best Practices

### 1. Restrict CORS in Production
Edit [api/index.py](api/index.py#L11):
```python
CORS(app, resources={r"/api/*": {"origins": ["https://your-production-domain.com"]}})
```

### 2. Rate Limiting
Consider adding Vercel Edge Config for rate limiting (Pro feature)

### 3. Input Validation
Current implementation validates file types and request data ✅

## 🎯 Performance Optimization

### Current Optimizations ✅
- Server-side streaming (reduces timeout risk)
- Image optimization (Next.js automatic)
- Compression enabled
- No-cache headers for dynamic content

### Recommended Additions
1. **Add CDN caching** for static assets
2. **Implement request caching** with Vercel KV (Pro)
3. **Monitor cold starts** and optimize bundle size

## 📚 Additional Resources

- [Vercel Python Runtime Docs](https://vercel.com/docs/functions/serverless-functions/runtimes/python)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Gemini API Documentation](https://ai.google.dev/docs)

## ✅ Deployment Checklist

- [ ] Gemini API key added to Vercel environment variables
- [ ] Repository connected to Vercel
- [ ] Health check endpoint returns 200 OK
- [ ] Chat functionality works (test with simple query)
- [ ] Document upload works (test with small PDF)
- [ ] CORS configured for production domain
- [ ] Monitoring/analytics enabled

---

**Ready to deploy!** Your project is configured correctly for Vercel serverless. 🚀
