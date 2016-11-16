var generateQueryString = require('./utils').generateQueryString,
    request = require('request'),
    xml2js = require('xml2js');

var parser = xml2js.Parser({
    attrkey: '@',
    charkey: '_',
    explicitArray: false
});


if (typeof Promise === 'undefined') { 
  Promise = require('es6-promise').Promise;
}
    
var runQuery = function (credentials, method) {

  return function (query, cb) {
    var req = query.request || request;
    delete query.request;
    var url = generateQueryString(query, method, credentials);

    var p = new Promise(function(resolve, reject) {
      var success = function(results) {
        if (typeof cb === 'function') {
          cb.apply(null, [null].concat(Array.prototype.slice.call(arguments)));
        }else{
          resolve(results);
        }
      };

      var failure = function(err) {
        if (typeof cb === 'function') {
          cb.call(null, err);
        } else {
          reject(err);
        }
      };


      req(url, function (err, response, body) {
        if (err) {
          failure(err);
        } else if (!response) {
          failure("No response (check internet connection)");
        } else if (response.statusCode !== 200) {
            parser.parseString(body, function (err, resp) {
            if (err) {
              failure(err);
            } else {
              failure(resp[method + 'ErrorResponse']);
            }
          });
        } else {
            parser.parseString(body, function (err, resp) {
            if (err) {
              failure(err);
            } else {
              var respObj = resp[method + 'Response'];
                
                if (respObj.Items) {
                // Request Error
                if (respObj.Items.Request && respObj.Items.Request.Errors) {
                  failure(respObj.Items.Request.Errors);
                } else if (respObj.Items.Item) {
                  success(
                    respObj.Items.Item,
                    respObj.Items
                  );
                }
              } else if (respObj.BrowseNodes ) {
                // Request Error
                if (respObj.BrowseNodes.Request && respObj.BrowseNodes.Request.Errors) {
                  failure(respObj.BrowseNodes.Request.Errors);
                } else if (respObj.BrowseNodes.BrowseNode) {
                  success(
                    respObj.BrowseNodes.BrowseNode,
                    respObj.BrowseNodes
                  );
                }
              }
            }
          });
        }
      });
    });
    
    if(typeof cb !== 'function') {
      return p;
    }
  };
};

var createClient = function (credentials) {
  return {
    itemSearch: runQuery(credentials, 'ItemSearch'),
    itemLookup: runQuery(credentials, 'ItemLookup'),
    browseNodeLookup: runQuery(credentials, 'BrowseNodeLookup')
  };
};

exports.createClient = createClient;
