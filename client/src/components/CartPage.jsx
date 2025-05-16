import React from "react";
import { useCart } from "../contexts/CartContext";
import './CartPage.css';

const CartPage = () => {
  const { cartItems, removeFromCart, clearCart } = useCart();

  // Calcul du total
  const total = cartItems.reduce((sum, item) => sum + (item.prix * item.quantite), 0);

  return (
    <div className="cart-container">
      <h2 className="cart-title">🛒 Mon Panier</h2>

      {cartItems.length === 0 ? (
        <div className="empty-cart">
          <p>Votre panier est vide</p>
          <button className="continue-shopping">Continuer vos achats</button>
        </div>
      ) : (
        <>
          <ul className="cart-items">
            {cartItems.map((item) => (
              <li key={`${item.id}-${item.nom}`} className="cart-item">
                <div className="item-info">
                  <h3 className="item-name">{item.nom}</h3>
                  <p className="item-price">{item.prix} €</p>
                  <div className="item-quantity">
                    <span>Quantité : {item.quantite}</span>
                  </div>
                </div>
                <button
                  className="remove-btn"
                  onClick={() => removeFromCart(item)}
                  aria-label={`Retirer ${item.nom} du panier`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>

          <div className="cart-summary">
            <div className="total-section">
              <span>Total :</span>
              <span className="total-amount">{total.toFixed(2)} €</span>
            </div>
            <div className="action-buttons">
              <button className="clear-cart" onClick={clearCart}>
                Vider le panier
              </button>
              <button className="checkout-btn">Passer la commande</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CartPage;