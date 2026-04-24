import React, { useEffect, useState } from 'react';
import './ScriptDetails.scss';

export default function ScriptsDetails(props) {
  const { scripts: _scripts } = props.apps;

  const [scripts, setScripts] = useState([]);

  useEffect(() => {
    setScripts(_scripts);
  }, [_scripts]);

  return (
    <div className="Scripts">
      <h2 className="Scripts-title">Scripts</h2>
      <h3 className="Scripts-subtitle">
        {scripts.length >= 1
          ? `${scripts.length} script${scripts.length === 1 ? '' : 's'} ${
              scripts.length === 1 ? 'was' : 'were'
            } detected. Scripts are Javascript files being injected by apps or by the theme itself.`
          : `No script tags detected.`}
      </h3>

      <div className="Scripts-search">
        <input
          className="Scripts-input"
          type="text"
          placeholder="Search..."
          onChange={(event) => {
            const value = event.target.value;

            console.log('change', value);

            if (value === '' || !value) {
              setScripts(_scripts);
              return;
            }

            console.log('change (af)', value);

            const filtered = _scripts.filter((e) => e.includes(value));

            setScripts(filtered);
          }}
        />
      </div>

      <div className="Scripts-wrapper Apps-wrapper--script">
        {scripts && scripts.length >= 1 ? (
          scripts.map((e) => {
            return (
              <div className="Script">
                <div className="Script-text">
                  <div className="Script-text--left">
                    {' '}
                    <p className="Script-name">{e.split('?')[0]}</p>
                  </div>
                </div>
                <a
                  className="Script-link"
                  target="_blank"
                  rel="noreferrer"
                  href={`${e}?source=ezfycode.com`}
                ></a>
              </div>
            );
          })
        ) : (
          <p>No scripts found.</p>
        )}
      </div>
    </div>
  );
}
