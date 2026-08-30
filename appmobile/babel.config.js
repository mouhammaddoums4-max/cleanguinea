module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    env: {
      production: {
        // Les `console.*` restent dans le bundle expedie et donnent a qui
        // inspecte l'application une lecture commentee de son fonctionnement :
        // noms de routes, formes de reponses, identifiants en clair dans les
        // journaux. On les retire du build de production.
        //
        // `error` est conserve : les rapports de plantage en dependent.
        plugins: [['transform-remove-console', { exclude: ['error'] }]],
      },
    },
  };
};
