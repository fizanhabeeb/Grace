// src/styles/globalStyles.js
import { StyleSheet, Platform } from 'react-native';

export const createGlobalStyles = (theme) => StyleSheet.create({
  // --- LAYOUTS ---
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  card: {
    backgroundColor: theme.card,
    borderRadius: 12,
    padding: 15,
    margin: 10,
    elevation: 3, // Android Shadow
    shadowColor: '#000', // iOS Shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: theme.border,
    marginVertical: 10,
  },

  // --- INPUTS ---
  input: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: theme.text,
    backgroundColor: theme.inputBackground,
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    color: theme.textSecondary,
    marginBottom: 5,
    fontWeight: '600',
  },

  // --- BUTTONS ---
  primaryButton: {
    backgroundColor: theme.primary,
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  secondaryButton: {
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: theme.text,
    fontWeight: '600',
    fontSize: 14,
  },
  dangerButton: {
    backgroundColor: '#FF5252', // Red
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },

  // --- TEXT ---
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.text,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: theme.textSecondary,
  },
  bold: {
    fontWeight: 'bold',
    color: theme.text,
  },
  
  // --- MODALS ---
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: theme.card,
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '90%',
    elevation: 5,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 10, // Works on newer RN versions, adds space between buttons
  },
});