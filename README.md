# 📄 Intelliparse

**Intelliparse** is a smart document parsing and voice playback application built with **Next.js 14**, **TypeScript**, and AWS services.  
It allows users to upload documents, extracts structured data and summaries from them, and provides a text-to-speech option to listen to parsed results.  

---

## 🚀 Features

- 🌌 **Parallax UI**: Smooth, modern frontend with `react-scroll-parallax`.  
- 📤 **Document Upload**: Form to upload PDFs/images along with user details.  
- 🤖 **Backend Parsing**: Calls `/api/submit` route to process uploaded documents via AWS services (Textract, Bedrock, etc.).  
- 🧾 **Structured Results**: Extracted **key-value data** and **document type** are displayed in a responsive UI.  
- 🔊 **Voice Playback**: Summaries can be read aloud using browser `SpeechSynthesis`.  
- ☁️ **Infrastructure-as-Code**: Terraform configs (`main.tf`, `outputs.tf`) for provisioning AWS resources.  
- ✅ **Testing**: Jest + React Testing Library setup with code coverage.  

---

## 🛠 Tech Stack

- **Frontend**: Next.js 14, TypeScript, Bootstrap, React Scroll Parallax  
- **Backend**: Next.js API routes (`/api/submit`), Axios  
- **Cloud**: AWS (Textract, Bedrock, S3, Polly, KMS)  
- **IaC**: Terraform  
- **Testing**: Jest, @testing-library/react, @testing-library/jest-dom  

---

## 📂 Project Structure

```
src/
 ├── app/
 │   ├── page.tsx            # Main Intelliparse UI
 │   ├── layout.tsx          # Root layout
 │   └── api/submit/route.ts # API route handling uploads
 ├── lib/                    # AWS service clients & helpers
 │   ├── s3.ts
 │   ├── textract.ts
 │   ├── polly.ts
 │   ├── bedrock.ts
 │   ├── kms.ts
 │   └── awsClientOptions.ts
 └── __tests__/              # Jest test suites
terraform/
 ├── main.tf                 # AWS resources
 └── outputs.tf
```

---

## ⚙️ Setup

1. **Clone repo**

```bash
git clone https://github.com/<your-org>/intelliparse.git
cd intelliparse
```

2. **Install dependencies**

```bash
npm install
```

3. **Environment variables**

Create a `.env.local` file with your AWS credentials and configs:

```env
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_REGION=us-east-1
UPLOAD_BUCKET=intelliparse-bucket
BEDROCK_MODEL_ID=anthropic.claude-v2
```

*(For tests, you can use `setupAwsEnv.ts` with dummy values.)*

4. **Run locally**

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

---

## 🧪 Running Tests

```bash
npm test -- --coverage
```

- Uses **Jest** + **React Testing Library**  
- Coverage report will show % tested per file.  
- Mocked AWS environment is set up in `setupAwsEnv.ts`.  

---

## ☁️ Deploying with Terraform

1. Configure your AWS CLI:

```bash
aws configure
```

2. Deploy resources:

```bash
cd terraform
terraform init
terraform apply
```

---

## 📊 Example Workflow

1. User uploads an invoice PDF + fills out form.  
2. API `/api/submit` sends file to S3.  
3. AWS Textract extracts key-value pairs.  
4. AWS Bedrock generates a summary.  
5. AWS Polly (or browser TTS) reads it aloud.  
6. Parsed result and summary are shown on frontend.  

---

## 📌 Roadmap

- [ ] Improve test coverage for AWS service clients  
- [ ] Add multi-language TTS support  
- [ ] Enhance error handling and retries  
- [ ] Deploy frontend with Vercel and backend infra with AWS  

---

## 📜 License

MIT © 2025
