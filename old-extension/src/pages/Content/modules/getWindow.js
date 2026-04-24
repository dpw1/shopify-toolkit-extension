function getWindow() {
  return new Promise(function (resolve, reject) {
    let dummyWindowSelector = 'dummyWindow';

    const script = document.createElement('script');
    script.text = `
        let shopify;
        
                shopify = window["Shopify"];
              
              var shopifyData = JSON.stringify(shopify);
              document.body.insertAdjacentHTML("beforebegin", "<div id='${dummyWindowSelector}' style='display:none;width:0;height:0;pointer-events:none;'>"+videosData+"</div>")
          `;

    document.getElementsByTagName('head')[0].appendChild(script);

    let $data = document.getElementById(dummyWindowSelector);
    let data = JSON.parse($data.innerText);
    script.remove();
    $data.remove();
    resolve(data);
  });
}

export default getWindow;
