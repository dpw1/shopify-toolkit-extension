import React from 'react';
import './ThemeDetails.scss';
import ProductRecommendations from './ProductRecommendations';
import AppsDetails from './AppsDetails';

export default function ThemeDetails(props) {
  const { isInvalid, products } = props;
  /** theme = Shopify.theme.name (folder/rename), version = schema_version */
  const { shop, theme, version } = props.data.store || {};
  const { name, url, type, download } = props.data.theme || {};
  const { apps } = props.data;

  return (
    <div className="Details">
      <h2 className="Details-logo">Theme</h2>
      <h3 className="Details-subtitle">
        Information about the current theme being used by this Shopify store.
      </h3>
      <div className="Details-info">
        {/* ## Theme */}
        <div className="Details-row">
          <span className="Details-text Details-text--left">Name</span>
          <span className="Details-text Details-text--right">
            {' '}
            <a
              target="_blank"
              rel="noreferrer"
              href={`${download}?source=ezfycode.com`}
            >
              {name}
            </a>
          </span>
        </div>

        {name !== 'unknown' && (
          <>
            {/* ## Theme details */}
            <div className="Details-row">
              <span className="Details-text Details-text--left">Details</span>
              <span className="Details-text Details-text--right">
                <div className="Details-text--group">
                  <a
                    target="_blank"
                    rel="noreferrer"
                    href={`${url}?source=ezfycode.com`}
                  >
                    Preview
                  </a>{' '}
                  |{' '}
                  <a
                    target="_blank"
                    rel="noreferrer"
                    href={`${download}?source=ezfycode.com`}
                  >
                    Download
                  </a>
                </div>
              </span>
            </div>

            {/* ## Type (price) */}
            <div className="Details-row">
              <span className="Details-text Details-text--left">Type</span>
              <span className="Details-text Details-text--right">
                <span className={type === 'Free' ? `Details-text--free` : ``}>
                  {type}
                </span>
              </span>
            </div>
          </>
        )}

        {/* ## Store */}
        <div className="Details-row">
          <span className="Details-text Details-text--left">Store</span>
          <span className="Details-text Details-text--right">
            <span>https://{shop}</span>
          </span>
        </div>

        {/* ## Theme Rename */}
        <div className="Details-row">
          <span className="Details-text Details-text--left">Rename</span>
          <span className="Details-text Details-text--right">
            <span>{theme}</span>
          </span>
        </div>

        {/* ## Theme Version */}
        <div className="Details-row">
          <span className="Details-text Details-text--left">Version</span>
          <span className="Details-text Details-text--right">
            <span>{version}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
