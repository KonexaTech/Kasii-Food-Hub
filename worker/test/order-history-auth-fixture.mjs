import { generateKeyPair,exportJWK,SignJWT } from 'jose';
export async function orderHistoryAuthFixture(){
 const base='https://order-history-fixture.example.test';
 const {privateKey,publicKey}=await generateKeyPair('EdDSA');
 const jwk={...await exportJWK(publicKey),kid:'history-fixture',alg:'EdDSA'};
 return {base,jwk,token:subject=>new SignJWT({}).setProtectedHeader({alg:'EdDSA',kid:jwk.kid}).setSubject(subject).setIssuer(base).setAudience(base).setIssuedAt().setExpirationTime('5m').sign(privateKey)};
}
