import jwt, { type JwtPayload, type Secret, type SignOptions } from 'jsonwebtoken'

export default class JwtService {
  async verify(token: string, secret: Secret): Promise<string | JwtPayload> {
    return new Promise((resolve, reject) => {
      jwt.verify(token, secret, (err, decoded) => {
        if (err) return reject(err)
        if (decoded === undefined) return reject(new Error('Token did not contain a payload'))
        resolve(decoded)
      })
    })
  }

  async sign(
    payload: object,
    secret: Secret,
    expiresIn: SignOptions['expiresIn']
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      jwt.sign(payload, secret, { expiresIn }, (err, token) => {
        if (err) return reject(err)
        if (!token) return reject(new Error('Token not generated'))
        resolve(token)
      })
    })
  }

  decode(token: string): string | JwtPayload | null {
    return jwt.decode(token)
  }
}
