'use client'

import React, { useContext, useEffect, useState,  } from 'react';
import { useModal } from '@/hooks/useModal';

import '../styles/Modal.css';
import { MainContext } from '@/wrappers/MainContext';

interface ModalProps {
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ children }) => {

  const context = useContext(MainContext);
  if (!context) {
      throw new Error('useMainContext must be used within ContextProvider');
  }
  const { context: mainContext, updateContext, resetContext } = context;
  
  const { isOpen, openModal, closeModal, modalProps } = useModal();

  const [isVisible, setIsVisible] = useState(false);

  // const handleOverlayClick = () => {
  //   closeModal?.('overlay');
  // }

  // const handleClose = (e: React.MouseEvent | React.KeyboardEvent) => {
  //   e.stopPropagation();
  //   closeModal?.('close');
  // };


  useEffect(() => {
    if (mainContext.isModal) {
      // Trigger animation after component mounts
      setTimeout(() => setIsVisible(true), 10);
      document.body.style.overflow = 'hidden';
    } else {
      setTimeout(() => setIsVisible(false), 10);
      document.body.style.overflow = 'unset';
    }

    // const handleEscape = (e: KeyboardEvent) => {
    //   if (e.key === 'Escape') closeModal?.('close');
    // };

    // if (isOpen) {
    //   document.addEventListener('keydown', handleEscape);
    // }

    // return () => {
    //   document.removeEventListener('keydown', handleEscape);
    //   document.body.style.overflow = 'unset';
    // };
  }, [mainContext.isModal]);

  // if (!isOpen && !isVisible) return null;
  

  return (
    <div className={`modal-overlay ${isVisible ? 'modal-open' : ''}`} onClick={closeModal}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={closeModal}>
          ×
        </button>
        
        {children}
        
      </div>
    </div>
  );
};

export default Modal;