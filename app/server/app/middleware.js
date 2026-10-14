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
    // sendFile dotfile-checks every segment of an absolute path, so pass the
    // directory as root to keep it from rejecting dotted parent directories
    return res
      .status(404)
      .sendFile('404.html', { root: path.join(__dirname, 'public') });
  }

  next();
}

module.exports = { checkClientRouteExists };
