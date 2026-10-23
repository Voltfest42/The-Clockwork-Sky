/**
 * The CloudFront Function (viewer request) in front of the site. Every page is a
 * prerendered folder, "/the-turning-sky/index.html", in a private S3 bucket,
 * which doesn't serve a folder's index.html by itself. So the function:
 *
 * - sends any request for another host name (the distribution's own
 *   *.cloudfront.net address) to the same path and query on `host`, so search
 *   engines see the site at one address only;
 * - adds the trailing slash to a page's address ("/the-moon" → "/the-moon/") and
 *   drops a typed "index.html" ("/the-moon/index.html" → "/the-moon/"), so every
 *   page has exactly one address;
 * - serves "/the-moon/" from "/the-moon/index.html".
 *
 * All three redirects are permanent (301), and combine into one hop. Files (any
 * last path segment with a dot) pass through untouched. An address with no file
 * behind it gets a 403 from S3, which the distribution turns into the
 * prerendered 404 page with a 404 status.
 *
 * It is plain ES5, which the CloudFront Functions runtime accepts, and has no
 * imports, so the unit tests and the local test server (scripts/serve.ts) run
 * exactly this code.
 */
export function viewerRequestCode(host: string): string {
  return `
function handler(event) {
  var request = event.request;
  var uri = request.uri;
  var last = uri.substring(uri.lastIndexOf('/') + 1);

  var path = uri;
  if (last === 'index.html') path = uri.substring(0, uri.length - last.length);
  else if (last !== '' && last.indexOf('.') === -1) path = uri + '/';

  var sameHost = request.headers.host && request.headers.host.value === '${host}';
  if (sameHost && path === uri) {
    if (uri.charAt(uri.length - 1) === '/') request.uri = uri + 'index.html';
    return request;
  }

  var query = [];
  for (var name in request.querystring) {
    var param = request.querystring[name];
    var values = param.multiValue ? param.multiValue : [param];
    for (var i = 0; i < values.length; i++) {
      query.push(values[i].value === '' ? name : name + '=' + values[i].value);
    }
  }
  return {
    statusCode: 301,
    statusDescription: 'Moved Permanently',
    headers: { location: { value: 'https://${host}' + path + (query.length ? '?' + query.join('&') : '') } },
  };
}`;
}
