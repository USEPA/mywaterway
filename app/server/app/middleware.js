const path = require('node:path');

function checkClientRouteExists(req, res, next) {
  const clientRoutes = [
    'aquatic-life',
    'community',
    'drinking-water',
    'eating-fish',
    'national',
    'state-and-tribal',
    'swimming',
    'about',
    'data',
    'attains',
    'educators',
    'monitoring-report',
    'plan-summary',
    'waterbody-report',
    'state',
    'tribe',
  ];

  if (
    req.path !== '/' &&
    !clientRoutes.some((route) => {
      const head = '^\\/';
      const tail = '(\\/.*)?$';
      const regex = new RegExp(head + route + tail);
      return regex.test(req.path);
    })
  ) {
    return res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
  }

  next();
}

module.exports = { checkClientRouteExists };
