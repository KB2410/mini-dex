# Vercel Deployment Guide

## Step-by-Step Instructions

### 1. Go to Vercel
Visit: https://vercel.com

### 2. Sign In with GitHub
- Click "Sign Up" or "Log In"
- Choose "Continue with GitHub"
- Authorize Vercel to access your GitHub account

### 3. Import Your Repository
- Click "Add New..." → "Project"
- Find and select `KB2410/mini-dex` from your repositories
- Click "Import"

### 4. Configure Project Settings

**Root Directory:**
- Set to: `packages/frontend`
- This tells Vercel where your Next.js app is located

**Framework Preset:**
- Should auto-detect as "Next.js"

**Build Settings:**
- Build Command: `npm run build` (should be auto-filled)
- Output Directory: `.next` (should be auto-filled)
- Install Command: `npm install` (should be auto-filled)

### 5. Add Environment Variables

Click "Environment Variables" and add these:

```
NEXT_PUBLIC_CONTRACT_ADDRESS=CDEESHHROI4TRAEKGTQN4R5ZG33KEGYCUP7JKUZKFR3XRKFPHSDT3HYF
NEXT_PUBLIC_NETWORK=testnet
NEXT_PUBLIC_SENTRY_DSN=https://06976b6e232832994d0e1b66f85471eb@o4511007339053056.ingest.de.sentry.io/4511007349014608
SENTRY_ORG=
SENTRY_PROJECT=
SENTRY_AUTH_TOKEN=
```

**Note:** The Sentry variables can be left empty for now if you don't have Sentry configured.

### 6. Deploy
- Click "Deploy"
- Wait for the build to complete (2-3 minutes)
- Vercel will provide you with a deployment URL

### 7. Get Your Live Demo URL

Once deployed, you'll get a URL like:
- `https://mini-dex-xyz.vercel.app` (production)
- Or a custom domain if you configure one

### 8. Update README

Copy your deployment URL and update the README.md:

```markdown
🚀 **Live Demo**: https://your-deployment-url.vercel.app
```

### 9. Commit and Push

```bash
git add README.md
git commit -m "Add live demo URL to README"
git push origin main
```

## Troubleshooting

### Build Fails
- Check that root directory is set to `packages/frontend`
- Verify all environment variables are set
- Check build logs for specific errors

### Missing Dependencies
- Vercel should auto-install from package.json
- If issues persist, try clearing build cache in Vercel settings

### Environment Variables Not Working
- Make sure they start with `NEXT_PUBLIC_` for client-side access
- Redeploy after adding/changing environment variables

## Alternative: Deploy via CLI

If you prefer command line:

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy from frontend directory
cd packages/frontend
vercel --prod
```

## Post-Deployment

1. Test the live site
2. Verify contract address is correct
3. Test wallet connection (when implemented)
4. Update README with live demo URL
5. Take screenshots for documentation

## Custom Domain (Optional)

In Vercel dashboard:
1. Go to your project
2. Click "Settings" → "Domains"
3. Add your custom domain
4. Follow DNS configuration instructions

---

**Need Help?**
- Vercel Docs: https://vercel.com/docs
- Next.js Deployment: https://nextjs.org/docs/deployment
