// src/screens/MenuScreen.js
// Manage menu: add/edit items, variants, images + SEARCH + Grid UI

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ScrollView,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Image,
  Switch,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../context/LanguageContext';
import useOrientation from '../utils/useOrientation';
import { loadMenu, saveMenu } from '../utils/storage';
import * as ImagePicker from 'expo-image-picker';

const { width, height } = Dimensions.get('window');

export default function MenuScreen() {
  const { t, getCategoryName } = useLanguage();
  const insets = useSafeAreaInsets();
  const { isLandscape, numColumns, cardWidth, isTablet } = useOrientation();

  const [menuItems, setMenuItems] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [variantModalVisible, setVariantModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editingVariant, setEditingVariant] = useState(null);
  const [editingVariantIndex, setEditingVariantIndex] = useState(-1);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchText, setSearchText] = useState('');

  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemCategory, setItemCategory] = useState('Breakfast');
  const [itemImage, setItemImage] = useState(null);
  const [hasVariants, setHasVariants] = useState(false);
  const [variants, setVariants] = useState([]);

  const [variantName, setVariantName] = useState('');
  const [variantPrice, setVariantPrice] = useState('');

  const categories = ['All', 'Breakfast', 'Rice', 'Curry', 'Snacks', 'Beverages'];

  const safeBottom = Platform.OS === 'ios' ? insets.bottom : 10;
  const bottomPadding = 100 + safeBottom;

  useFocusEffect(
    useCallback(() => {
      loadMenuItems();
    }, [])
  );

  const loadMenuItems = async () => {
    const items = await loadMenu();
    setMenuItems(items);
  };

  // --- FILTERING LOGIC ---
  const filteredMenu = useMemo(() => {
    return menuItems.filter(item => {
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
      const matchesSearch = item.name.toLowerCase().includes(searchText.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [menuItems, selectedCategory, searchText]);

  // --- IMAGE PICKERS ---
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to photos');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });
    if (!result.canceled) {
      setItemImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to camera');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });
    if (!result.canceled) {
      setItemImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const showImageOptions = () => {
    Alert.alert('Add Image', 'Choose an option', [
      { text: 'Camera', onPress: takePhoto },
      { text: 'Gallery', onPress: pickImage },
      { text: 'Remove Image', onPress: () => setItemImage(null), style: 'destructive' },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  // --- MODAL CONTROLS ---
  const openAddModal = () => {
    setEditingItem(null); setItemName(''); setItemPrice(''); setItemCategory('Breakfast');
    setItemImage(null); setHasVariants(false); setVariants([]); setModalVisible(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item); setItemName(item.name); setItemPrice(item.price.toString());
    setItemCategory(item.category); setItemImage(item.image); setHasVariants(!!item.hasVariants);
    setVariants(item.variants || []); setModalVisible(true);
  };

  const openVariantModal = (variant = null, index = -1) => {
    setEditingVariant(variant);
    setEditingVariantIndex(index);
    if (variant) {
      setVariantName(variant.name);
      setVariantPrice(variant.price.toString());
    } else {
      setVariantName('');
      setVariantPrice('');
    }
    setVariantModalVisible(true);
  };

  // --- SAVE / DELETE LOGIC ---
  const saveVariant = () => {
    if (!variantName.trim() || !variantPrice || isNaN(parseFloat(variantPrice))) {
      Alert.alert('Error', 'Please enter valid variant name and price');
      return;
    }
    const newVariant = { id: editingVariant?.id || `v${Date.now()}`, name: variantName.trim(), price: parseFloat(variantPrice) };
    if (editingVariantIndex >= 0) {
      const updated = [...variants]; updated[editingVariantIndex] = newVariant; setVariants(updated);
    } else {
      setVariants([...variants, newVariant]);
    }
    setVariantModalVisible(false);
  };

  const saveItem = async () => {
    if (!itemName.trim() || !itemPrice || isNaN(parseFloat(itemPrice))) {
      Alert.alert(t('error'), t('enterValidPrice'));
      return;
    }
    const newItem = {
      id: editingItem?.id || Date.now().toString(),
      name: itemName.trim(),
      price: parseFloat(itemPrice),
      category: itemCategory,
      image: itemImage,
      hasVariants,
      variants: hasVariants ? variants : [],
    };
    const updatedMenu = editingItem ? menuItems.map((i) => (i.id === editingItem.id ? newItem : i)) : [...menuItems, newItem];
    await saveMenu(updatedMenu);
    setMenuItems(updatedMenu);
    setModalVisible(false);
    Alert.alert(t('success'), editingItem ? t('itemUpdated') : t('itemAdded'));
  };

  const deleteItem = (item) => {
    Alert.alert(t('deleteItem'), `${t('deleteConfirm')} "${item.name}"?`, [
      { text: t('cancel'), style: 'cancel' },
      { text: t('delete'), style: 'destructive', onPress: async () => {
          const updatedMenu = menuItems.filter((i) => i.id !== item.id);
          await saveMenu(updatedMenu);
          setMenuItems(updatedMenu);
        },
      },
    ]);
  };

  const renderMenuItem = ({ item }) => {
    const dynamicImageHeight = isLandscape ? cardWidth * 0.5 : cardWidth * 0.65;
    return (
      <TouchableOpacity 
        style={[styles.menuCard, { width: cardWidth, margin: 5 }]} 
        onPress={() => openEditModal(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardImageContainer}>
          {item.image ? (
            <Image source={{ uri: item.image }} style={[styles.cardImage, { height: dynamicImageHeight }]} />
          ) : (
            <View style={[styles.cardPlaceholder, { height: dynamicImageHeight }]}>
              <Text style={{ fontSize: isLandscape ? 28 : 36 }}>🍽️</Text>
            </View>
          )}
          {/* Delete Badge from second code */}
          <TouchableOpacity style={styles.deleteBadge} onPress={() => deleteItem(item)}>
            <Text style={styles.deleteBadgeText}>✕</Text>
          </TouchableOpacity>
          {item.hasVariants && item.variants.length > 0 && (
            <View style={styles.variantBadge}>
              <Text style={styles.variantBadgeText}>{item.variants.length}</Text>
            </View>
          )}
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.cardPrice}>₹{item.price.toFixed(0)}</Text>
        </View>
        <View style={styles.editIndicator}>
          <Text style={styles.editIndicatorText}>Tap to edit</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* SEARCH BAR */}
      <View style={styles.searchBarContainer}>
        <View style={styles.searchWrapper}>
          <Text style={{ marginRight: 8 }}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder={t('enterItemName')}
            placeholderTextColor="#999"
            value={searchText}
            onChangeText={setSearchText}
            clearButtonMode="while-editing"
          />
          {searchText !== '' && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* CATEGORY FILTER */}
      <View style={{ height: 60 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryContent}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category}
              style={[styles.categoryButton, selectedCategory === category && styles.categoryButtonActive]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text style={[styles.categoryText, selectedCategory === category && styles.categoryTextActive]}>
                {getCategoryName(category)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <Text style={styles.itemCount}>
        {t('showing')} {filteredMenu.length} {t('items')} • Tap to edit
      </Text>

      <FlatList
        data={filteredMenu}
        renderItem={renderMenuItem}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        key={numColumns}
        contentContainerStyle={{ padding: 5, paddingBottom: bottomPadding }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<Text style={styles.emptyText}>{searchText ? "No items match your search" : t('noItemsCategory')}</Text>}
      />

      <View style={[styles.addButtonContainer, { bottom: safeBottom + 10 }]}>
        <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
          <Text style={styles.addButtonText}>{t('addNewItem')}</Text>
        </TouchableOpacity>
      </View>

      {/* ITEM MODAL */}
      <Modal visible={modalVisible} animationType="slide" transparent={true} onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>{editingItem ? t('editItem') : t('addNewItem')}</Text>
              
              <TouchableOpacity style={styles.imagePicker} onPress={showImageOptions}>
                {itemImage ? <Image source={{ uri: itemImage }} style={styles.imagePreview} /> : <Text>📸 Tap to add image</Text>}
              </TouchableOpacity>

              <Text style={styles.inputLabel}>{t('itemName')}</Text>
              <TextInput style={styles.input} value={itemName} onChangeText={setItemName} placeholder={t('enterItemName')} />

              <Text style={styles.inputLabel}>{t('price')} (₹)</Text>
              <TextInput style={styles.input} value={itemPrice} onChangeText={setItemPrice} keyboardType="numeric" />

              <Text style={styles.inputLabel}>{t('category')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.categoryChipsContainer}>
                  {categories.filter(c => c !== 'All').map(cat => (
                    <TouchableOpacity key={cat} style={[styles.categoryChip, itemCategory === cat && styles.categoryChipActive]} onPress={() => setItemCategory(cat)}>
                      <Text style={[styles.categoryChipText, itemCategory === cat && { color: '#fff' }]}>{getCategoryName(cat)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <View style={styles.variantToggle}>
                <View><Text style={styles.inputLabel}>Has Variants?</Text></View>
                <Switch value={hasVariants} onValueChange={setHasVariants} trackColor={{ false: '#ddd', true: '#8B0000' }} />
              </View>

              {hasVariants && (
                <View style={styles.variantsSection}>
                  <Text style={{ fontWeight: 'bold', marginBottom: 10 }}>Variants ({variants.length})</Text>
                  {variants.map((v, idx) => (
                    <View key={v.id} style={styles.variantRow}>
                      <Text style={{ flex: 1 }}>{v.name} - ₹{v.price}</Text>
                      <TouchableOpacity onPress={() => openVariantModal(v, idx)}><Text style={{ marginRight: 15 }}>✏️</Text></TouchableOpacity>
                      <TouchableOpacity onPress={() => { const u = variants.filter((_, i) => i !== idx); setVariants(u); }}><Text>🗑️</Text></TouchableOpacity>
                    </View>
                  ))}
                  <TouchableOpacity style={styles.addVarBtn} onPress={() => openVariantModal()}><Text style={{ color: '#fff' }}>+ Add Variant</Text></TouchableOpacity>
                </View>
              )}

              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}><Text>{t('cancel')}</Text></TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={saveItem}><Text style={{ color: '#fff', fontWeight: 'bold' }}>{t('save')}</Text></TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* VARIANT MODAL */}
      <Modal visible={variantModalVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { width: '80%' }]}>
            <Text style={styles.modalTitle}>{editingVariant ? 'Edit Variant' : 'Add Variant'}</Text>
            <TextInput style={styles.input} value={variantName} onChangeText={setVariantName} placeholder="Variant Name" />
            <TextInput style={styles.input} value={variantPrice} onChangeText={setVariantPrice} placeholder="Price" keyboardType="numeric" />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={{ flex: 1, padding: 15 }} onPress={() => setVariantModalVisible(false)}><Text>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, { flex: 1 }]} onPress={saveVariant}><Text style={{ color: '#fff' }}>Add</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  searchBarContainer: { padding: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  searchWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f0f0', borderRadius: 20, paddingHorizontal: 15, height: 45 },
  searchInput: { flex: 1, fontSize: 15 },
  clearIcon: { fontWeight: 'bold', color: '#999', padding: 5, fontSize: 18 },
  categoryContent: { paddingHorizontal: 10, alignItems: 'center' },
  categoryButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f0f0f0', marginRight: 8 },
  categoryButtonActive: { backgroundColor: '#8B0000' },
  categoryText: { color: '#666', fontWeight: '600' },
  categoryTextActive: { color: '#fff' },
  itemCount: { paddingHorizontal: 15, paddingVertical: 8, color: '#666', fontSize: 12 },
  menuCard: { backgroundColor: '#fff', borderRadius: 12, elevation: 3, overflow: 'hidden' },
  cardImageContainer: { position: 'relative' },
  cardImage: { width: '100%', resizeMode: 'cover' },
  cardPlaceholder: { width: '100%', backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' },
  deleteBadge: { position: 'absolute', top: 5, right: 5, backgroundColor: 'rgba(255,0,0,0.7)', borderRadius: 12, width: 24, height: 24, justifyContent: 'center', alignItems: 'center' },
  deleteBadgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  variantBadge: { position: 'absolute', top: 5, left: 5, backgroundColor: '#8B0000', borderRadius: 10, width: 20, height: 20, justifyContent: 'center', alignItems: 'center' },
  variantBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  cardInfo: { padding: 10 },
  cardName: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  cardPrice: { color: '#8B0000', fontWeight: 'bold', marginTop: 2 },
  editIndicator: { backgroundColor: '#f0f0f0', padding: 5, alignItems: 'center' },
  editIndicatorText: { fontSize: 10, color: '#999' },
  addButtonContainer: { position: 'absolute', left: 20, right: 20 },
  addButton: { backgroundColor: '#8B0000', padding: 16, borderRadius: 12, alignItems: 'center', elevation: 5 },
  addButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#999' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 20, padding: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  imagePicker: { height: 120, backgroundColor: '#f0f0f0', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  imagePreview: { width: '100%', height: '100%', borderRadius: 12 },
  inputLabel: { fontSize: 14, color: '#666', marginBottom: 5, marginTop: 10 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12, marginBottom: 15 },
  categoryChipsContainer: { flexDirection: 'row', paddingVertical: 5 },
  categoryChip: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f0f0f0', marginRight: 8 },
  categoryChipActive: { backgroundColor: '#8B0000' },
  categoryChipText: { fontSize: 13, color: '#666' },
  variantToggle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  variantsSection: { backgroundColor: '#f9f9f9', padding: 10, borderRadius: 10, marginBottom: 15 },
  variantRow: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#eee', alignItems: 'center' },
  addVarBtn: { backgroundColor: '#4CAF50', padding: 10, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  cancelBtn: { flex: 1, padding: 15, alignItems: 'center' },
  saveBtn: { flex: 1, padding: 15, backgroundColor: '#8B0000', borderRadius: 10, alignItems: 'center' }
});