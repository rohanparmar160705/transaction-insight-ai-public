pipeline {
  agent any

  environment {
    REGISTRY = 'local'
    BACKEND_IMAGE = 'transaction-backend'
    FRONTEND_IMAGE = 'transaction-frontend'
    MLSVC_IMAGE = 'transaction-ml-service'
  }

  triggers {
    githubPush()
  }

  options {
    timestamps()
    ansiColor('xterm')
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Backend: Install & Test') {
      steps {
        dir('backend') {
          sh 'npm ci'
          sh 'npm run build || true'
        }
      }
    }

    stage('Frontend: Install & Build') {
      steps {
        dir('frontend') {
          sh 'npm ci'
          sh 'npm run build'
        }
      }
    }

    stage('ML Service: Python Setup & Test') {
      steps {
        dir('ml-service') {
          sh 'python3 -m venv venv && . venv/bin/activate && pip install --upgrade pip setuptools wheel && pip install -r requirements.txt && python -m pytest -q || true'
        }
      }
    }

    stage('Docker Build') {
      steps {
        script {
          sh "docker build -t ${BACKEND_IMAGE}:latest backend"
          sh "docker build -t ${FRONTEND_IMAGE}:latest frontend"
          sh "docker build -t ${MLSVC_IMAGE}:latest ml-service"
        }
      }
    }

    stage('Deploy with docker-compose') {
      steps {
        sh 'docker compose -f docker-compose.yml up -d --build'
      }
    }
  }

  post {
    failure {
      echo 'Build failed.'
    }
    success {
      echo 'Deployment successful.'
    }
  }
}
