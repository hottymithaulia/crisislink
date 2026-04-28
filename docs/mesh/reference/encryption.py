import os
import json
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.backends import default_backend

class EncryptionManager:
    """
    Handles all encryption/decryption for mesh
    RSA-4096 for key exchange + AES-256-GCM for messages
    """
    
    def __init__(self, node_id: str = "default"):
        self.node_id = node_id
        self.backend = default_backend()
        self.private_key, self.public_key = self._load_or_generate_keys()
    
    def _load_or_generate_keys(self):
        """Load or generate RSA-4096 key pair"""
        key_file = f".keys/{self.node_id}_private.pem"
        
        if os.path.exists(key_file):
            with open(key_file, "rb") as f:
                private_key = serialization.load_pem_private_key(
                    f.read(),
                    password=None,
                    backend=self.backend
                )
            return private_key, private_key.public_key()
        else:
            # Generate new RSA-4096 key
            private_key = rsa.generate_private_key(
                public_exponent=65537,
                key_size=4096,
                backend=self.backend
            )
            
            # Save key
            os.makedirs(".keys", exist_ok=True)
            with open(key_file, "wb") as f:
                f.write(
                    private_key.private_bytes(
                        encoding=serialization.Encoding.PEM,
                        format=serialization.PrivateFormat.PKCS8,
                        encryption_algorithm=serialization.NoEncryption()
                    )
                )
            return private_key, private_key.public_key()
    
    def get_public_key_bytes(self) -> bytes:
        """Export public key as bytes"""
        return self.public_key.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        )
    
    @staticmethod
    def load_public_key_from_bytes(key_bytes: bytes):
        """Load public key from bytes"""
        return serialization.load_pem_public_key(
            key_bytes,
            backend=default_backend()
        )
    
    def encrypt_message(self, plaintext: str, recipient_public_key) -> dict:
        """
        Encrypt message with AES-256-GCM
        Encrypt AES key with recipient's RSA public key
        
        Returns: {"encrypted_key", "iv", "ciphertext", "tag"}
        """
        # Generate random AES key
        aes_key = os.urandom(32)
        iv = os.urandom(16)
        
        # Encrypt message with AES-256-GCM
        cipher = Cipher(
            algorithms.AES(aes_key),
            modes.GCM(iv),
            backend=self.backend
        )
        encryptor = cipher.encryptor()
        ciphertext = encryptor.update(plaintext.encode()) + encryptor.finalize()
        
        # Encrypt AES key with recipient's public key
        encrypted_aes_key = recipient_public_key.encrypt(
            aes_key,
            padding.OAEP(
                mgf=padding.MGF1(algorithm=hashes.SHA256()),
                algorithm=hashes.SHA256(),
                label=None
            )
        )
        
        return {
            "encrypted_key": encrypted_aes_key.hex(),
            "iv": iv.hex(),
            "ciphertext": ciphertext.hex(),
            "tag": encryptor.tag.hex()
        }
    
    def decrypt_message(self, encrypted_data: dict) -> str:
        """Decrypt message"""
        # Convert hex back to bytes
        encrypted_key = bytes.fromhex(encrypted_data["encrypted_key"])
        iv = bytes.fromhex(encrypted_data["iv"])
        ciphertext = bytes.fromhex(encrypted_data["ciphertext"])
        tag = bytes.fromhex(encrypted_data["tag"])
        
        # Decrypt AES key with our private key
        aes_key = self.private_key.decrypt(
            encrypted_key,
            padding.OAEP(
                mgf=padding.MGF1(algorithm=hashes.SHA256()),
                algorithm=hashes.SHA256(),
                label=None
            )
        )
        
        # Decrypt message with AES-256-GCM
        cipher = Cipher(
            algorithms.AES(aes_key),
            modes.GCM(iv, tag),
            backend=self.backend
        )
        decryptor = cipher.decryptor()
        plaintext = decryptor.update(ciphertext) + decryptor.finalize()
        
        return plaintext.decode()


# Test encryption
if __name__ == "__main__":
    enc_a = EncryptionManager("node_a")
    enc_b = EncryptionManager("node_b")
    
    message = "Hello from A to B!"
    encrypted = enc_a.encrypt_message(message, enc_b.public_key)
    decrypted = enc_b.decrypt_message(encrypted)
    
    print(f"Original: {message}")
    print(f"Decrypted: {decrypted}")
    print(f"Match: {message == decrypted}")
