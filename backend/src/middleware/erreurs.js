import { ZodError } from 'zod';

export function nonTrouve(req, res) {
  res.status(404).json({ erreur: `Route introuvable : ${req.method} ${req.originalUrl}` });
}

/** Convertit les erreurs Zod et Prisma en reponses JSON lisibles. */
export function gestionErreurs(err, req, res, _next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      erreur: 'Donnees invalides',
      details: err.issues.map((i) => ({ champ: i.path.join('.'), message: i.message })),
    });
  }

  // Contrainte d unicite violee. Le message nomme ce que l utilisateur a saisi :
  // « Valeur deja utilisee (telephone) » ne dit rien a un abonne.
  if (err.code === 'P2002') {
    const cibles = Array.isArray(err.meta?.target) ? err.meta.target : [];
    const messages = {
      telephone: 'Ce numero est deja utilise par un compte. Connectez-vous ou utilisez « Mot de passe oublie ».',
      email: 'Cette adresse e-mail est deja utilisee par un compte.',
      matricule: 'Ce numero employe est deja attribue.',
      reference: 'Cette reference existe deja.',
    };
    const connu = cibles.find((c) => messages[c]);
    return res.status(409).json({
      erreur: connu ? messages[connu] : `Valeur deja utilisee (${cibles.join(', ') || 'champ'})`,
      champ: connu ?? undefined,
    });
  }

  // Enregistrement introuvable
  if (err.code === 'P2025') {
    return res.status(404).json({ erreur: 'Enregistrement introuvable' });
  }

  const status = err.status || 500;
  if (status >= 500) console.error(err);

  res.status(status).json({
    erreur: status >= 500 ? 'Erreur interne du serveur' : err.message,
  });
}

/** Enveloppe un handler async pour que ses rejets partent vers gestionErreurs. */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
