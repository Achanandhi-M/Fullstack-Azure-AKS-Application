# Fullstack Azure AKS Demo Application

A robust, production-grade full-stack application built as an interview preparation project. This project demonstrates modern cloud-native architecture, infrastructure-as-code, and continuous integration/continuous deployment (CI/CD) pipelines.

## 🚀 Architecture Overview

This application separates concerns cleanly into three tiers:

- **Frontend**: A modern React application built with Vite and packaged with an Nginx reverse proxy. It features a responsive, glassmorphism-inspired UI with user authentication and an interactive dashboard.
- **Backend**: A Node.js Express REST API that handles Basic Authentication, securely manages transactional data, and directly integrates with Azure SDKs for blob uploads.
- **Storage**:
  - **Relational Data**: Azure Database for PostgreSQL (Flexible Server) stores all user, authentication, and structured app data.
  - **Blob Storage**: Azure Storage Accounts manage all uploaded assets (e.g., images) completely decoupling state from the application pods.

## 🏗️ Infrastructure as Code (Terraform)

All Azure resources are provisioned deterministically using Terraform. The scripts can be found in the `/terraform` directory.

The infrastructure provisions:
1. An **Azure Kubernetes Service (AKS)** cluster (`Standard_D2s_v3` node pool).
2. An **Azure Database for PostgreSQL Flexible Server**.
3. An **Azure Storage Account** with a public `uploads` container.

### Deploying the Infrastructure locally
```bash
cd terraform/
# Initialize terraform plugins
terraform init
# Apply the configuration (you can customize your db_admin_password in terraform.tfvars)
terraform apply
```

## 🔄 CI/CD Pipeline (GitHub Actions)

Deployment to the AKS cluster is fully automated via GitHub Actions (`.github/workflows/deploy.yml`).

Upon pushing to the `main` branch, the pipeline will:
1. Check out the codebase.
2. Log into GitHub Container Registry (`ghcr.io`).
3. Build the `backend` and `frontend` Docker images.
4. Push the images with fresh SHAs to GHCR.
5. Authenticate to Azure using a Service Principal.
6. Pull Kubernetes credentials.
7. Inject the necessary connection strings as K8s Secrets.
8. Apply the `k8s/` Deployment and Service manifests to spin up the pods and provision the Azure LoadBalancer.

### Pipeline Requirements (GitHub Secrets)
To use the deployment pipeline, you must provision an Azure Service Principal (`az ad sp create-for-rbac`) and add the following **Repository Secrets**:
- `AZURE_CREDENTIALS`: Full JSON output from the standard SP creation.
- `AZURE_STORAGE_CONNECTION_STRING`: Generated dynamically by Terraform.
- `DB_HOST`: The FQDN of your PostgreSQL database.
- `DB_USER`: Admin username for the PostgreSQL database.
- `DB_PASSWORD`: The password chosen in Terraform variables.

## 🏃 Accessing the Application

Once the pipeline completes, Kubernetes will provision a public LoadBalancer for the frontend Nginx reverse proxy. 

To find the URL, fetch your cluster credentials and execute:
```bash
kubectl get svc frontend-service
```
Access the `EXTERNAL-IP` displayed in your terminal via any web browser.
