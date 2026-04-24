import React, { useState, useEffect } from 'react';
import './ProductRecommendations.scss';
import parse from 'html-react-parser';

import Carousel from 'nuka-carousel';

export default function ProductRecommendations(props) {
  const { products } = props;

  return (
    <div className="ProductRecommendations">
      <h2 className="ProductRecommendations-title">Code snippets</h2>
      <h3 className="ProductRecommendations-subtitle">
        Copy & paste code snippets compatible with this theme. Code snippets
        load faster than apps, do not have subscriptions, last for life and can
        replace most apps functionalities.
      </h3>
      <Carousel className="ProductRecommendations-slider">
        {products &&
          products.length >= 1 &&
          products.map((e) => {
            const _slug = e.name
              .replace(/[^\w\s]/gi, '')
              .toLowerCase()
              .split(' ')
              .join('-');

            const url = `https://ezfycode.com/shop/${_slug.replaceAll(
              '--',
              '-'
            )}?source=app-detector`;

            return (
              <div className="ProductRecommendations-item" key={e.id}>
                <div className="ProductRecommendations-item">
                  <a
                    className="ProductRecommendations-image-link"
                    rel="noreferrer"
                    href={url}
                    target="_blank"
                  >
                    <div className="aspectratio">
                      <img loading="lazy" src={e.thumbnailUrl} alt="" />
                    </div>
                  </a>
                  <a
                    className="ProductRecommendations-name"
                    rel="noreferrer"
                    href={url}
                    target="_blank"
                  >
                    {e.name}
                  </a>
                </div>
                <span>{parse(e.subtitle)}</span>
                <a
                  className="ProductRecommendations-action"
                  rel="noreferrer"
                  href={url}
                  target="_blank"
                >
                  View Details
                </a>
              </div>
            );
          })}
      </Carousel>
    </div>
  );
}
