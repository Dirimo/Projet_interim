import type { Courriel } from './mail.service';

/**
 * Les courriels transactionnels, en clair.
 *
 * Aucun moteur de gabarit : deux messages ne justifient pas une dependance de
 * plus, et un envoi lisible dans le code se relit sans lancer l'application.
 * Chaque message porte ses deux versions — une messagerie qui bloque le HTML ne
 * doit pas laisser la personne sans lien.
 */

/** Echappement minimal : rien de ce qui suit n'est saisi librement, mais le nom l'est. */
function echapper(valeur: string): string {
  return valeur
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const PIED = `Releve — mise a disposition d'intervenants a domicile`;

function enveloppe(titre: string, corps: string): string {
  return `<!doctype html>
<html lang="fr">
<body style="margin:0;padding:24px;background:#f5f5f4;font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#1c1917">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;padding:32px">
    <h1 style="margin:0 0 20px;font-size:20px;font-weight:600">${echapper(titre)}</h1>
    ${corps}
    <p style="margin:32px 0 0;padding-top:16px;border-top:1px solid #e7e5e4;font-size:12px;color:#78716c">
      ${PIED}
    </p>
  </div>
</body>
</html>`;
}

/**
 * Confirmation d'adresse.
 *
 * Le lien complet est repete en clair sous le bouton : un client de messagerie
 * qui n'affiche pas le HTML laisserait sinon un bouton mort, et la personne ne
 * pourrait pas se connecter du tout — c'est le seul chemin d'acces.
 */
export function courrielVerification(
  destinataire: string,
  prenom: string | null,
  lien: string,
  heures: number,
): Courriel {
  const bonjour = prenom ? `Bonjour ${prenom},` : 'Bonjour,';
  const titre = 'Confirmez votre adresse e-mail';

  const texte = [
    bonjour,
    '',
    'Votre compte Releve est cree. Il reste a confirmer cette adresse pour y acceder :',
    '',
    lien,
    '',
    `Ce lien est valable ${heures} heures et ne fonctionne qu'une fois.`,
    "Si vous n'etes pas a l'origine de cette inscription, ignorez ce message : sans ce clic, le compte reste inaccessible.",
    '',
    PIED,
  ].join('\n');

  const html = enveloppe(
    titre,
    `<p style="margin:0 0 16px;line-height:1.6">${echapper(bonjour)}</p>
     <p style="margin:0 0 24px;line-height:1.6">
       Votre compte Releve est cree. Il reste a confirmer cette adresse pour y acceder.
     </p>
     <p style="margin:0 0 24px">
       <a href="${echapper(lien)}"
          style="display:inline-block;background:#0f766e;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600">
         Confirmer mon adresse
       </a>
     </p>
     <p style="margin:0 0 8px;font-size:13px;color:#57534e;line-height:1.6">
       Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>
       <span style="word-break:break-all;color:#0f766e">${echapper(lien)}</span>
     </p>
     <p style="margin:24px 0 0;font-size:13px;color:#57534e;line-height:1.6">
       Ce lien est valable ${heures} heures et ne fonctionne qu'une fois.
       Si vous n'etes pas a l'origine de cette inscription, ignorez ce message :
       sans ce clic, le compte reste inaccessible.
     </p>`,
  );

  return { destinataire, sujet: `Releve — ${titre}`, texte, html };
}
