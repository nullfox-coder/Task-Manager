#!/bin/sh

# Set variables
CERT_DIR="./certs"
DOMAIN="localhost"
DAYS_VALID=365

# Create directory for certificates
mkdir -p $CERT_DIR

echo "Generating self-signed SSL certificates for development..."

# Generate private key
openssl genrsa -out $CERT_DIR/server.key 2048

# Generate CSR
openssl req -new -key $CERT_DIR/server.key -out $CERT_DIR/server.csr -subj "/CN=$DOMAIN/O=TaskManager/C=US"

# Generate self-signed certificate
openssl x509 -req -days $DAYS_VALID -in $CERT_DIR/server.csr -signkey $CERT_DIR/server.key -out $CERT_DIR/server.crt

# Generate Diffie-Hellman parameters for improved security
openssl dhparam -out $CERT_DIR/dhparam.pem 2048

echo "Certificates generated successfully in $CERT_DIR directory:"
ls -la $CERT_DIR

echo "Note: These are self-signed certificates for development use only."
echo "For production, use certificates from a trusted Certificate Authority." 