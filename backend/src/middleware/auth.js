import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';

export function signerToken(user) {
  return jwt.sign(
    // `gen` est la generation du jeton. Elle permet de revoquer d'un coup tous
    // les jetons deja emis pour ce compte : un JWT est autonome, on ne peut pas
    // l'annuler autrement qu'en le comparant a une valeur cote serveur.
    { sub: user.id, role: user.role, telephone: user.telephone, gen: user.jetonVersion ?? 0 },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '30d' },
  );
}

/** Exige un jeton valide et charge l utilisateur sur req.user. */
export async function authentifier(req, res, next) {
  try {
    const entete = req.headers.authorization || '';
    const token = entete.startsWith('Bearer ') ? entete.slice(7) : null;
    if (!token) return res.status(401).json({ erreur: 'Jeton manquant' });

    const charge = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: charge.sub },
      include: { client: true, collecteur: true },
    });

    if (!user || !user.actif || user.supprimeLe) {
      return res.status(401).json({ erreur: 'Compte introuvable ou desactive' });
    }

    // Generation perimee : mot de passe change, deconnexion globale, compte
    // repris. Le jeton reste cryptographiquement valide mais ne vaut plus rien.
    if ((charge.gen ?? 0) !== user.jetonVersion) {
      return res.status(401).json({
        erreur: 'Session expiree. Reconnectez-vous.',
        code: 'SESSION_REVOQUEE',
      });
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ erreur: 'Jeton invalide ou expire' });
  }
}

/** Restreint une route a certains roles. Exemple : exigerRole('ADMIN', 'SUPERVISEUR') */
export function exigerRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ erreur: 'Non authentifie' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ erreur: 'Acces refuse pour ce role' });
    }
    next();
  };
}
