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

/**
 * Avertissement apres un changement de mot de passe.
 *
 * C'est le seul message de la plateforme qui ne sert a rien quand tout va
 * bien. Sa valeur est entiere dans le cas contraire : quelqu'un qui prend un
 * compte commence par en changer le mot de passe, et sans cet avertissement le
 * proprietaire ne l'apprend qu'en se retrouvant dehors, sans savoir pourquoi ni
 * quand. Il est donc envoye meme — surtout — quand le changement est legitime.
 *
 * Il ne contient jamais le mot de passe, ni ancien ni nouveau : un courriel
 * traverse des serveurs qu'on ne maitrise pas et reste dans une boite pour
 * toujours.
 */
export function courrielMotDePasseChange(
  destinataire: string,
  prenom: string | null,
  origine: 'compte' | 'agence',
): Courriel {
  const bonjour = prenom ? `Bonjour ${prenom},` : 'Bonjour,';
  const titre =
    origine === 'agence'
      ? 'Votre mot de passe a ete reinitialise'
      : 'Votre mot de passe a ete modifie';

  const fait =
    origine === 'agence'
      ? 'Votre agence vient de reinitialiser le mot de passe de votre compte Releve. Le nouveau mot de passe vous est communique par elle, jamais par courriel.'
      : 'Le mot de passe de votre compte Releve vient d etre modifie.';

  const alerte =
    origine === 'agence'
      ? "Si vous n'avez rien demande, contactez votre agence : elle seule a pu faire cette operation."
      : "Si vous n'etes pas a l'origine de ce changement, contactez immediatement votre agence : votre compte est probablement compromis.";

  const texte = [
    bonjour,
    '',
    fait,
    'Toutes vos sessions ont ete fermees : il faut vous reconnecter sur chacun de vos appareils.',
    '',
    alerte,
    '',
    PIED,
  ].join('\n');

  const html = enveloppe(
    titre,
    `<p style="margin:0 0 16px;line-height:1.6">${echapper(bonjour)}</p>
     <p style="margin:0 0 16px;line-height:1.6">${echapper(fait)}</p>
     <p style="margin:0 0 24px;line-height:1.6">
       Toutes vos sessions ont ete fermees : il faut vous reconnecter sur chacun de vos appareils.
     </p>
     <p style="margin:0;padding:12px 14px;line-height:1.6;font-size:13px;background:#fef2f2;border-radius:8px">
       ${echapper(alerte)}
     </p>`,
  );

  return { destinataire, sujet: `Releve — ${titre}`, texte, html };
}

/**
 * Lien de reinitialisation du mot de passe.
 *
 * Le message est ecrit pour quelqu'un qui n'a peut-etre rien demande : c'est un
 * formulaire public, donc n'importe qui peut saisir l'adresse d'un tiers. D'ou
 * le rappel explicite qu'ignorer le courriel suffit — sans clic, rien ne change,
 * et l'ancien mot de passe continue de fonctionner.
 */
export function courrielReinitialisation(
  destinataire: string,
  prenom: string | null,
  lien: string,
  heures: number,
): Courriel {
  const bonjour = prenom ? `Bonjour ${prenom},` : 'Bonjour,';
  const titre = 'Reinitialiser votre mot de passe';
  const validite =
    heures <= 1 ? 'Ce lien est valable une heure' : `Ce lien est valable ${heures} heures`;

  const texte = [
    bonjour,
    '',
    'Une reinitialisation du mot de passe a ete demandee pour votre compte Releve.',
    'Pour en choisir un nouveau, ouvrez ce lien :',
    '',
    lien,
    '',
    `${validite} et ne fonctionne qu'une fois.`,
    "Si vous n'avez rien demande, ignorez ce message : sans ce clic, rien ne change et votre mot de passe actuel reste valable.",
    '',
    PIED,
  ].join('\n');

  const html = enveloppe(
    titre,
    `<p style="margin:0 0 16px;line-height:1.6">${echapper(bonjour)}</p>
     <p style="margin:0 0 24px;line-height:1.6">
       Une reinitialisation du mot de passe a ete demandee pour votre compte Releve.
       Pour en choisir un nouveau&nbsp;:
     </p>
     <p style="margin:0 0 24px">
       <a href="${echapper(lien)}"
          style="display:inline-block;background:#0f766e;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600">
         Choisir un nouveau mot de passe
       </a>
     </p>
     <p style="margin:0 0 8px;font-size:13px;color:#57534e;line-height:1.6">
       Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur&nbsp;:<br>
       <span style="word-break:break-all;color:#0f766e">${echapper(lien)}</span>
     </p>
     <p style="margin:24px 0 0;font-size:13px;color:#57534e;line-height:1.6">
       ${echapper(validite)} et ne fonctionne qu'une fois.
       Si vous n'avez rien demande, ignorez ce message : sans ce clic, rien ne change
       et votre mot de passe actuel reste valable.
     </p>`,
  );

  return { destinataire, sujet: `Releve — ${titre}`, texte, html };
}

/**
 * Fin de conservation des pieces justificatives.
 *
 * Ce message n'annonce pas une bonne nouvelle : sans reponse, les pieces
 * seront effacees. Il dit donc, dans cet ordre, ce qui est concerne, ce qui se
 * passe si la personne ne fait rien, et jusqu'a quand elle peut repondre. Un
 * seul lien, qui mene a une page ou elle choisit — plutot que deux liens dans
 * un courriel, ou le clic irreversible se trouverait a deux centimetres de
 * l'autre.
 */
export function courrielConservationDocuments(
  destinataire: string,
  prenom: string | null,
  pieces: string[],
  lien: string,
  effacementLe: string,
): Courriel {
  const bonjour = prenom ? `Bonjour ${prenom},` : 'Bonjour,';
  const titre = 'Vos pieces justificatives arrivent a un an';

  const texte = [
    bonjour,
    '',
    "Les pieces suivantes de votre dossier Releve ont ete deposees il y a un an :",
    '',
    ...pieces.map((piece) => `  - ${piece}`),
    '',
    'Souhaitez-vous que nous les conservions ? Repondez en ouvrant ce lien :',
    '',
    lien,
    '',
    `Sans reponse de votre part avant le ${effacementLe}, elles seront effacees.`,
    "Vous pourrez les redeposer a tout moment depuis votre profil ; nous ne gardons rien d'autre de ces fichiers.",
    '',
    PIED,
  ].join('\n');

  const liste = pieces
    .map(
      (piece) =>
        `<li style="margin:0 0 6px">${echapper(piece)}</li>`,
    )
    .join('');

  const html = enveloppe(
    titre,
    `<p style="margin:0 0 16px;line-height:1.6">${echapper(bonjour)}</p>
     <p style="margin:0 0 12px;line-height:1.6">
       Les pieces suivantes de votre dossier Releve ont ete deposees il y a un an&nbsp;:
     </p>
     <ul style="margin:0 0 24px;padding-left:20px;line-height:1.6">${liste}</ul>
     <p style="margin:0 0 24px;line-height:1.6">
       Souhaitez-vous que nous les conservions&nbsp;?
     </p>
     <p style="margin:0 0 24px">
       <a href="${echapper(lien)}"
          style="display:inline-block;background:#0f766e;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600">
         Repondre
       </a>
     </p>
     <p style="margin:0 0 8px;font-size:13px;color:#57534e;line-height:1.6">
       Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur&nbsp;:<br>
       <span style="word-break:break-all;color:#0f766e">${echapper(lien)}</span>
     </p>
     <p style="margin:24px 0 0;font-size:13px;color:#57534e;line-height:1.6">
       Sans reponse de votre part avant le ${echapper(effacementLe)}, ces pieces seront
       effacees. Vous pourrez les redeposer a tout moment depuis votre profil&nbsp;; nous
       ne gardons rien d'autre de ces fichiers.
     </p>`,
  );

  return { destinataire, sujet: `Releve — ${titre}`, texte, html };
}
