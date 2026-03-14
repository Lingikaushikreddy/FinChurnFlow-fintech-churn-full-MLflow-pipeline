/**
 * useContacts Hook - Contacts state and actions
 */

import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import {
  fetchContacts,
  createContact,
  deleteContact,
  setSearchQuery,
} from '../store/slices/contactsSlice';

interface CreateContactData {
  name: string;
  upi_id?: string;
  phone?: string;
}

export const useContacts = () => {
  const dispatch = useDispatch<AppDispatch>();
  const contacts = useSelector((state: RootState) => state.contacts);

  const loadContacts = useCallback(
    async (options?: { page?: number; search?: string }) => {
      return dispatch(
        fetchContacts({
          page: options?.page || 1,
          search: options?.search || contacts.searchQuery,
        })
      ).unwrap();
    },
    [dispatch, contacts.searchQuery]
  );

  const handleCreateContact = useCallback(
    async (data: CreateContactData) => {
      return dispatch(createContact(data)).unwrap();
    },
    [dispatch]
  );

  const handleDeleteContact = useCallback(
    async (id: string) => {
      return dispatch(deleteContact(id)).unwrap();
    },
    [dispatch]
  );

  const handleSetSearchQuery = useCallback(
    (query: string) => {
      dispatch(setSearchQuery(query));
    },
    [dispatch]
  );

  const refreshContacts = useCallback(() => {
    return loadContacts({ page: 1 });
  }, [loadContacts]);

  return {
    ...contacts,
    loadContacts,
    refreshContacts,
    createContact: handleCreateContact,
    deleteContact: handleDeleteContact,
    setSearchQuery: handleSetSearchQuery,
  };
};

export default useContacts;
