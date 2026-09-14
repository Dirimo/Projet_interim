import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { MOT_DE_PASSE } from './fixtures';

export interface Session {
  jeton: string;
  rafraichissement: string;
}

export async function connecter(
  app: INestApplication,
  email: string,
  motDePasse: string = MOT_DE_PASSE,
): Promise<Session> {
  const reponse = await request(app.getHttpServer())
    .post('/api/auth/connexion')
    .send({ email, motDePasse })
    .expect(200);

  return {
    jeton: reponse.body.jeton,
    rafraichissement: reponse.body.jetonRafraichissement,
  };
}

/** Raccourci de lisibilite : `avec(app, session).get(...)`. */
export function avec(app: INestApplication, session: Session) {
  const agent = request(app.getHttpServer());
  const entete = `Bearer ${session.jeton}`;

  return {
    get: (chemin: string) => agent.get(chemin).set('Authorization', entete),
    post: (chemin: string) => agent.post(chemin).set('Authorization', entete),
    patch: (chemin: string) => agent.patch(chemin).set('Authorization', entete),
    put: (chemin: string) => agent.put(chemin).set('Authorization', entete),
    delete: (chemin: string) => agent.delete(chemin).set('Authorization', entete),
  };
}
