# JWT RS256 keys

Project này dùng JWT thuật toán **RS256** (RSA key pair).

## Cách 1 (tự tạo bằng OpenSSL)

Chạy tại thư mục project:

```bash
openssl genrsa -out keys/jwtRS256.key 2048
openssl rsa -in keys/jwtRS256.key -pubout -out keys/jwtRS256.key.pub
```

## Cách 2 (tự động khi chạy dev)

Nếu chưa có key files và bạn **không** đặt `NODE_ENV=production`, app sẽ tự generate:

- `keys/jwtRS256.key`
- `keys/jwtRS256.key.pub`

## Cấu hình đường dẫn key (tuỳ chọn)

Đặt biến môi trường:

- `JWT_PRIVATE_KEY_PATH` (mặc định `keys/jwtRS256.key`)
- `JWT_PUBLIC_KEY_PATH` (mặc định `keys/jwtRS256.key.pub`)

