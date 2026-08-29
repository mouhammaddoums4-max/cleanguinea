import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';

export function signerToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, telephone: user.telephone },
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

    if (!user || !user.actif) {
      return res.status(401).json({ erreur: 'Compte introuvable ou desactive' });
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
