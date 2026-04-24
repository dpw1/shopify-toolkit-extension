import React from 'react';

export default function Footer() {
  return (
    <footer>
      <span>
        Extension made by{' '}
        <a
          className="animation--gradient-text"
          target="_blank"
          rel="noreferrer"
          href="https://ezfycode.com"
        >
          ezfycode.com
        </a>
      </span>
      <br />
      <span>
        Please consider giving us a{' '}
        <a
          target="_blank"
          rel="noreferrer"
          href="https://chrome.google.com/webstore/detail/shopify-theme-wizard-by-e/fhkelfkhcaokghlkckfgjoejhanelped/reviews"
        >
          5 star review at the Chrome store by clicking here.
        </a>
        Thank you!
      </span>
    </footer>
  );
}
