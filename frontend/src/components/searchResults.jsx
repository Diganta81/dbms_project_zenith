// SearchResultsPage.jsx
import React from "react";
import "../styles/searchResults.css"; // Import the corresponding CSS file
import { useData } from "./Datacontext.jsx";

const SearchResultsPage = () => {
  const { showProduct, setShowProduct } = useData();
  const products = showProduct;
  setShowProduct([]);
  return (
    <div className="search-results-page">
      <h2>Search Results</h2>
      <div className="product-list">
        {products.map((product) => (
          <div key={product.id} className="product-card">
            <img
              src={product.image}
              alt={product.name}
              className="product-image"
            />
            <div className="product-details">
              <h3>{product.product_name}</h3>
              <p>{product.description}</p>
              <p>Price: ${product.price}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SearchResultsPage;