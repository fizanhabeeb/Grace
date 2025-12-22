// src/screens/MenuScreen.js
// Manage menu: add/edit items, variants, images + SEARCH

import React, { useState, useCallback } from 'react';
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
  const { isLandscape, isSmallScreen, isTablet } = useOrientation();

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

  const safeBottom = insets.bottom > 0 ? insets.bottom : 15;
  const listBottomPadding = isLandscape ? 80 : 100 + safeBottom;
  const buttonBottomPosition = isLandscape ? 10 : safeBottom + 10;

  useFocusEffect(
    useCallback(() => {
      loadMenuItems();
    }, [])
  );

  const loadMenuItems = async () => {
    const items = await loadMenu();
    setMenuItems(items);
  };

  // IMAGE PICKERS
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

  // OPEN/CLOSE MODALS
  const openAddModal = () => {
    setEditingItem(null);
    setItemName('');
    setItemPrice('');
    setItemCategory('Breakfast');
    setItemImage(null);
    setHasVariants(false);
    setVariants([]);
    setModalVisible(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setItemName(item.name);
    setItemPrice(item.price.toString());
    setItemCategory(item.category);
    setItemImage(item.image);
    setHasVariants(!!item.hasVariants);
    setVariants(item.variants || []);
    setModalVisible(true);
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

  // SAVE / DELETE VARIANTS
  const saveVariant = () => {
    if (!variantName.trim() || !variantPrice || isNaN(parseFloat(variantPrice))) {
      Alert.alert('Error', 'Please enter valid variant name and price');
      return;
    }
    const newVariant = {
      id: editingVariant?.id || `v${Date.now()}`,
      name: variantName.trim(),
      price: parseFloat(variantPrice),
    };
    if (editingVariantIndex >= 0) {
      const updated = [...variants];
      updated[editingVariantIndex] = newVariant;
      setVariants(updated);
    } else {
      setVariants([...variants, newVariant]);
    }
    setVariantModalVisible(false);
  };

  const deleteVariant = (index) => {
    Alert.alert('Delete Variant', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          const updated = variants.filter((_, i) => i !== index);
          setVariants(updated);
        },
      },
    ]);
  };

  // SAVE / DELETE ITEMS
  const saveItem = async () => {
    if (!itemName.trim()) {
      Alert.alert(t('error'), t('enterValidName'));
      return;
    }
    if (!itemPrice || isNaN(parseFloat(itemPrice))) {
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

    let updatedMenu;
    if (editingItem) {
      updatedMenu = menuItems.map((item) => (item.id === editingItem.id ? newItem : item));
    } else {
      updatedMenu = [...menuItems, newItem];
    }

    await saveMenu(updatedMenu);
    setMenuItems(updatedMenu);
    setModalVisible(false);
    Alert.alert(t('success'), editingItem ? t('itemUpdated') : t('itemAdded'));
  };

  const deleteItem = (item) => {
    Alert.alert(
      t('deleteItem'),
      `${t('deleteConfirm')} "${item.name}"?`,
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            const updatedMenu = menuItems.filter((i) => i.id !== item.id);
            await saveMenu(updatedMenu);
            setMenuItems(updatedMenu);
          },
        },
      ]
    );
  };

  // FILTERING BY CATEGORY + SEARCH
  const filteredByCategory =
    selectedCategory === 'All'
      ? menuItems
      : menuItems.filter((item) => item.category === selectedCategory);

  const filteredMenu = filteredByCategory.filter((item) =>
    item.name.toLowerCase().includes(searchText.toLowerCase())
  );

  // RENDER ITEM
  const renderMenuItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.menuItem,
        isLandscape && styles.menuItemLandscape,
        isLandscape && { width: isTablet ? '32%' : '48%' },
      ]}
      onPress={() => openEditModal(item)}
      activeOpacity={0.7}
    >
      <View style={styles.imageContainer}>
        {item.image ? (
          <Image
            source={{ uri: item.image }}
            style={[styles.itemImage, isLandscape && styles.itemImageLandscape]}
          />
        ) : (
          <View style={[styles.placeholderImage, isLandscape && styles.itemImageLandscape]}>
            <Text style={styles.placeholderText}>🍽️</Text>
          </View>
        )}
        {item.hasVariants && item.variants.length > 0 && (
          <View style={styles.variantBadge}>
            <Text style={styles.variantBadgeText}>{item.variants.length}</Text>
          </View>
        )}
      </View>
      <View style={styles.itemInfo}>
        <Text style={[styles.itemName, isLandscape && { fontSize: 13 }]} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.itemCategory}>{getCategoryName(item.category)}</Text>
        {item.hasVariants && (
          <Text style={styles.variantCount}>{item.variants.length} variants</Text>
        )}
      </View>
      <Text style={[styles.itemPrice, isLandscape && { fontSize: 15 }]}>
        ₹{item.price.toFixed(0)}
      </Text>
      <TouchableOpacity style={styles.deleteButton} onPress={() => deleteItem(item)}>
        <Text style={styles.buttonText}>🗑️</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* SEARCH BOX */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search item..."
          placeholderTextColor="#999"
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      {/* CATEGORY FILTER */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}  // ← no maxHeight overrides now
        contentContainerStyle={styles.categoryContent}
      >
        {categories.map((category) => (
          <TouchableOpacity
            key={category}
            style={[
              styles.categoryButton,
              selectedCategory === category && styles.categoryButtonActive,
            ]}
            onPress={() => setSelectedCategory(category)}
          >
            <Text
              style={[
                styles.categoryText,
                selectedCategory === category && styles.categoryTextActive,
              ]}
            >
              {getCategoryName(category)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={styles.itemCount}>
        {t('showing')} {filteredMenu.length} {t('items')} • Tap to edit
      </Text>

      {/* MENU LIST */}
      <FlatList
        data={filteredMenu}
        renderItem={renderMenuItem}
        keyExtractor={(item) => item.id}
        numColumns={isLandscape ? (isTablet ? 3 : 2) : 1}
        key={isLandscape ? (isTablet ? 'landscape-tablet' : 'landscape') : 'portrait'}
        contentContainerStyle={[
          styles.listContainer,
          { paddingBottom: listBottomPadding },
          isLandscape && { paddingHorizontal: 5 },
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<Text style={styles.emptyText}>{t('noItemsCategory')}</Text>}
      />

      {/* ADD BUTTON */}
      <View
        style={[
          styles.addButtonContainer,
          { bottom: buttonBottomPosition },
        ]}
      >
        <TouchableOpacity
          style={[styles.addButton, isLandscape && { paddingVertical: 10 }]}
          onPress={openAddModal}
        >
          <Text style={[styles.addButtonText, isLandscape && { fontSize: 14 }]}>
            {t('addNewItem')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ITEM MODAL */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View
            style={[
              styles.modalContent,
              { maxHeight: height * 0.85 },
              isLandscape && { width: '70%', maxHeight: height * 0.9 },
            ]}
          >
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text
                style={[
                  styles.modalTitle,
                  isLandscape && { fontSize: 18, marginBottom: 15 },
                ]}
              >
                {editingItem ? t('editItem') : t('addNewItem')}
              </Text>

              <View style={isLandscape ? { flexDirection: 'row' } : {}}>
                <View style={isLandscape ? { flex: 1, marginRight: 15 } : {}}>
                  <Text style={styles.inputLabel}>Item Image</Text>
                  <TouchableOpacity
                    style={[styles.imagePickerButton, isLandscape && { marginBottom: 10 }]}
                    onPress={showImageOptions}
                  >
                    {itemImage ? (
                      <Image
                        source={{ uri: itemImage }}
                        style={[styles.previewImage, isLandscape && { height: 100 }]}
                      />
                    ) : (
                      <View
                        style={[
                          styles.imagePlaceholder,
                          isLandscape && { height: 80 },
                        ]}
                      >
                        <Text
                          style={[
                            styles.imagePlaceholderEmoji,
                            isLandscape && { fontSize: 28 },
                          ]}
                        >
                          📷
                        </Text>
                        <Text style={styles.imagePlaceholderText}>Tap to add image</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>

                <View style={isLandscape ? { flex: 1 } : {}}>
                  <Text style={styles.inputLabel}>{t('itemName')}</Text>
                  <TextInput
                    style={[styles.input, isLandscape && { padding: 10 }]}
                    value={itemName}
                    onChangeText={setItemName}
                    placeholder={t('enterItemName')}
                    placeholderTextColor="#999"
                  />

                  <Text style={styles.inputLabel}>Base {t('price')} (₹)</Text>
                  <TextInput
                    style={[styles.input, isLandscape && { padding: 10 }]}
                    value={itemPrice}
                    onChangeText={setItemPrice}
                    placeholder={t('enterPrice')}
                    keyboardType="numeric"
                    placeholderTextColor="#999"
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>{t('category')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.categoryChipsContainer}>
                  {categories
                    .filter((c) => c !== 'All')
                    .map((category) => (
                      <TouchableOpacity
                        key={category}
                        style={[
                          styles.categoryChip,
                          itemCategory === category && styles.categoryChipActive,
                        ]}
                        onPress={() => setItemCategory(category)}
                      >
                        <Text
                          style={[
                            styles.categoryChipText,
                            itemCategory === category && styles.categoryChipTextActive,
                          ]}
                        >
                          {getCategoryName(category)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                </View>
              </ScrollView>

              <View style={styles.variantToggle}>
                <View>
                  <Text style={styles.inputLabel}>Has Variants/Sub-items?</Text>
                  <Text style={styles.variantHint}>
                    E.g., Chicken/Beef/Fish options
                  </Text>
                </View>
                <Switch
                  value={hasVariants}
                  onValueChange={setHasVariants}
                  trackColor={{ false: '#ddd', true: '#8B0000' }}
                  thumbColor={hasVariants ? '#fff' : '#f4f3f4'}
                />
              </View>

              {hasVariants && (
                <View style={styles.variantsSection}>
                  <Text style={styles.variantsSectionTitle}>
                    Variants ({variants.length})
                  </Text>
                  {variants.map((variant, index) => (
                    <View key={variant.id} style={styles.variantItem}>
                      <View style={styles.variantInfo}>
                        <Text style={styles.variantName}>{variant.name}</Text>
                        <Text style={styles.variantPriceText}>₹{variant.price}</Text>
                      </View>
                      <View style={styles.variantActions}>
                        <TouchableOpacity
                          style={styles.variantEditBtn}
                          onPress={() => openVariantModal(variant, index)}
                        >
                          <Text>✏️</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.variantDeleteBtn}
                          onPress={() => deleteVariant(index)}
                        >
                          <Text>🗑️</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                  <TouchableOpacity
                    style={styles.addVariantButton}
                    onPress={() => openVariantModal()}
                  >
                    <Text style={styles.addVariantButtonText}>+ Add Variant</Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.cancelButton, isLandscape && { padding: 12 }]}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>{t('cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveButton, isLandscape && { padding: 12 }]}
                  onPress={saveItem}
                >
                  <Text style={styles.saveButtonText}>{t('save')}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* VARIANT MODAL */}
      <Modal
        visible={variantModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setVariantModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.variantModalContent,
              isLandscape && { width: '50%' },
            ]}
          >
            <Text style={[styles.modalTitle, isLandscape && { fontSize: 18 }]}>
              {editingVariant ? 'Edit Variant' : 'Add Variant'}
            </Text>

            <Text style={styles.inputLabel}>Variant Name</Text>
            <TextInput
              style={[styles.input, isLandscape && { padding: 10 }]}
              value={variantName}
              onChangeText={setVariantName}
              placeholder="e.g., Chicken Biriyani"
              placeholderTextColor="#999"
            />

            <Text style={styles.inputLabel}>Price (₹)</Text>
            <TextInput
              style={[styles.input, isLandscape && { padding: 10 }]}
              value={variantPrice}
              onChangeText={setVariantPrice}
              placeholder="e.g., 150"
              placeholderTextColor="#999"
              keyboardType="numeric"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.cancelButton, isLandscape && { padding: 12 }]}
                onPress={() => setVariantModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, isLandscape && { padding: 12 }]}
                onPress={saveVariant}
              >
                <Text style={styles.saveButtonText}>{t('save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// STYLES
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },

  searchContainer: {
    paddingHorizontal: 12,
    paddingTop: 10,
    backgroundColor: '#f5f5f5',
  },
  searchInput: {
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: 15,
    paddingVertical: Platform.OS === 'ios' ? 8 : 6,
    fontSize: 14,
  },

  categoryScroll: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  categoryContent: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  categoryButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  categoryButtonActive: {
    backgroundColor: '#8B0000',
  },
  categoryText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 12,
  },
  categoryTextActive: {
    color: '#fff',
  },

  itemCount: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    color: '#666',
    fontSize: 12,
  },
  listContainer: {
    paddingHorizontal: 10,
  },

  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 12,
    marginBottom: 10,
    elevation: 2,
  },
  menuItemLandscape: {
    margin: 5,
    marginBottom: 10,
  },
  imageContainer: {
    position: 'relative',
  },
  itemImage: {
    width: 55,
    height: 55,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
  },
  itemImageLandscape: {
    width: 45,
    height: 45,
  },
  placeholderImage: {
    width: 55,
    height: 55,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 22,
  },
  variantBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#8B0000',
    borderRadius: 10,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  variantBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  itemCategory: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  variantCount: {
    fontSize: 11,
    color: '#8B0000',
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#8B0000',
    marginRight: 10,
  },
  deleteButton: {
    padding: 8,
  },
  buttonText: {
    fontSize: 18,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 50,
    fontStyle: 'italic',
  },

  addButtonContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  addButton: {
    backgroundColor: '#8B0000',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    width: '92%',
  },
  variantModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    width: '85%',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: '#333',
    backgroundColor: '#fafafa',
  },
  imagePickerButton: {
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    borderRadius: 12,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: 140,
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  imagePlaceholderEmoji: {
    fontSize: 36,
  },
  imagePlaceholderText: {
    color: '#999',
    marginTop: 8,
    fontSize: 12,
  },
  categoryChipsContainer: {
    flexDirection: 'row',
    paddingVertical: 5,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: '#8B0000',
  },
  categoryChipText: {
    color: '#666',
    fontSize: 13,
  },
  categoryChipTextActive: {
    color: '#fff',
  },
  variantToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 15,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  variantHint: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  variantsSection: {
    marginTop: 15,
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
  },
  variantsSectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  variantItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  variantInfo: {
    flex: 1,
  },
  variantName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  variantPriceText: {
    fontSize: 13,
    color: '#8B0000',
    marginTop: 2,
  },
  variantActions: {
    flexDirection: 'row',
  },
  variantEditBtn: {
    padding: 8,
    marginRight: 5,
  },
  variantDeleteBtn: {
    padding: 8,
  },
  addVariantButton: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  addVariantButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: 25,
  },
  cancelButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    backgroundColor: '#8B0000',
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});