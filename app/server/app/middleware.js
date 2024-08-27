const path = require('node:path');

function checkClientRouteExists(req, res, next) {
  const clientRoutes = [
    '/aquatic-life',
    '/community',
    '/drinking-water',
    '/eating-fish',
    '/national',
    '/state-and-tribal',
    '/swimming',
    '/about',
    '/data',
    '/attains',
    '/educators',
    '/monitoring-report',
    '/plan-summary',
    '/waterbody-report',
  ].reduce((acc, cur) => {
    return acc.concat([`${cur}`, `${cur}/`]);
  }, []);

  let routeExists = req.path === '/';
  clientRoutes.forEach((route) => {
    if (route.includes(req.path)) routeExists = true;
  });

  if (!routeExists) {
    return res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
  }

  next();
}

module.exports = { checkClientRouteExists };
