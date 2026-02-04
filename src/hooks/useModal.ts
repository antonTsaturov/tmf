import { MainContext } from '@/wrappers/MainContext';
import { useState, useCallback, useContext } from 'react';

/**
 * Custom hook to control Modal open/close state and handlers.
 * Usage:
 *   const { isOpen, openModal, closeModal, modalProps } = useModal();
 *   <Modal {...modalProps}>...</Modal>
 */
export function useModal() {

    const context = useContext(MainContext);
    if (!context) {
        throw new Error('useMainContext must be used within ContextProvider');
    }
    const { context: mainContext, updateContext, resetContext } = context;


	const [isOpen, setIsOpen] = useState(false);

	const openModal = useCallback(() => {
        setIsOpen(true);
        updateContext({ isModal: true });
    }, []);
    
	const closeModal = useCallback(() => {
        setIsOpen(false);
        updateContext({ isModal: false });
    }, []);


	// Handler for Modal onClose
	const handleClose = useCallback(() => {
		setIsOpen(false);
        updateContext({ isModal: false });
	}, []);

	// Props to pass to Modal
	const modalProps = {
		isOpen,
		onClose: handleClose,
	};

	return { isOpen, openModal, closeModal, modalProps };
}
