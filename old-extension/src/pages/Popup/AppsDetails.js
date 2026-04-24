import React, { useEffect } from 'react';
import './AppsDetails.scss';

export default function AppsDetails(props) {
  const { apps } = props.apps;
  const { total } = props;

  return (
    <div className="Apps">
      <h2 className="Apps-title">Apps</h2>
      <h3 className="Apps-subtitle">
        {apps.length >= 1
          ? `${apps.length} app${
              apps.length === 1 ? '' : 's'
            } detected out of ${total}.`
          : `No apps detected (0 out of ${total}).`}
      </h3>

      <div className="Apps-wrapper">
        {apps &&
          apps.length >= 1 &&
          apps.map((e) => {
            const size = `90`;
            const image = `${e.picture}?height=${size}&quality=90&width=${size}`;
            console.log(e.name);
            return (
              <div className="App">
                <img className="App-image" src={image} alt="" />
                <div className="App-text">
                  <div className="App-text--left">
                    {' '}
                    <p className="App-name">{e.name}</p>
                    <p className="App-description">{e.description}</p>
                  </div>
                  <div className="App-text--right">
                    <p className="App-author">{e.author}</p>

                    <span className="App-button">View details</span>
                  </div>
                </div>
                <a
                  className="App-link"
                  target="_blank"
                  rel="noreferrer"
                  href={`${e.download}?source=ezfycode.com`}
                ></a>
              </div>
            );
          })}
      </div>
    </div>
  );
}
