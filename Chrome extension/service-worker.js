// Save downloar methor reference for future use
download = chrome.downloads.download;

// Attach network debugger  to current page
chrome.action.onClicked.addListener(function (tab) {
  if (tab.url.startsWith('http')) {
    chrome.debugger.attach({ tabId: tab.id }, '1.2', function () {
      chrome.debugger.sendCommand(
        { tabId: tab.id },
        'Network.enable',
        {},
        function () {
          if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError);
          }
        }
      );
    });
  } else {
    console.log('Debugger can only be attached to HTTP/HTTPS pages.');
  }
});

// Requests buffer. We may need both request and response
requests = {}

chrome.debugger.onEvent.addListener(function (source, method, params) {

  if (method === 'Network.requestWillBeSent' || method === 'Network.requestWillBeSentExtraInfo') {

    let fileName = whereToSave(params);

    if(!fileName)
      return;

    request = {
      requestId: params.requestId,
      requestWillBeSent: params,
      requestBody: undefined,
      responseReceived: undefined,
      responseBody: undefined,
      fileName: fileName,
    }

    requests[params.requestId] = request;

    return;
  }


  if (method === 'Network.responseReceived' || method === 'Network.dataReceived') {

    if (!requests.hasOwnProperty(params.requestId))
      return;

    request = requests[params.requestId];

    chrome.debugger.sendCommand(
      { tabId: source.tabId },
      "Network.getResponseBody",
      { "requestId": params.requestId },
      (response) => {
        saveDump(response.body, request.fileName);
        delete requests[request.requestId];
      }
    );

    return;
  }

  if (!requests.hasOwnProperty(params.requestId))
    return;

    console.log(method, params);    

  if (method === 'Network.requestWillBeSentExtraInfo')
    return;

  if (method === 'Network.responseReceivedExtraInfo')
    return;

  if (method === 'Network.webSocketFrameReceived')
    return;

  if (method === 'Network.webSocketFrameSent')
    return;

  if (method === 'Network.loadingFinished')
    return;

  console.log(method, params);

});


async function saveDump(details, fileName) {
  const dataURL = `data:application/json;base64,${btoa(unescape(encodeURIComponent(details)))}`;

  chrome.downloads.download({
    url: dataURL,
    filename: fileName,
    saveAs: false,
  });
}

/* 
Returns the name of file to be used to save request data 
If request should be ignored returns undefined
*/
function whereToSave(params){

  if (params.request.url === "https://finance.ozon.ru/api/v2/clientOperations")
    return `OzonClientOperations.json`;

  if(params.request.url === "https://bank.yandex.ru/graphql"){

    let postData = JSON.parse(params.request.postData);

    if(postData.operationName === "OperationsFeed")
      return `YandexClientOperations.json`;
      
  }

  if(params.request.url.startsWith('https://online.vtb.ru/msa/api-gw/private/history-hub/history-hub-homer/v1/history/byAccount?')){
    return `VtbClientOperations.json`;
  }

  return undefined;

}
