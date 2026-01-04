// src/screens/MenuScreen.js
import React, { useState, useCallback, useMemo, useEffect } from 'react';
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
import { useTheme } from '../context/ThemeContext';
import useOrientation from '../utils/useOrientation';
import { loadMenu, saveMenu, loadCategories, saveCategories, getDefaultCategories } from '../utils/storage';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function MenuScreen() {
  const { t, getCategoryName } = useLanguage();
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { isLandscape, numColumns, cardWidth } = useOrientation();

  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState(['All']); // Dynamic Categories
  
  const [modalVisible, setModalVisible] = useState(false);
  const [variantModalVisible, setVariantModalVisible] = useState(false);
  const [catManagerVisible, setCatManagerVisible] = useState(false); // Category Manager Modal

  const [editingItem, setEditingItem] = useState(null);
  const [editingVariant, setEditingVariant] = useState(null);
  const [editingVariantIndex, setEditingVariantIndex] = useState(-1);
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  // --- DEBOUNCE STATE ---
  const [searchText, setSearchText] = useState('');
  const [debouncedSearchText, setDebouncedSearchText] = useState('');

  // Form State
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemCategory, setItemCategory] = useState('Breakfast');
  const [itemImage, setItemImage] = useState(null);
  const [hasVariants, setHasVariants] = useState(false);
  const [variants, setVariants] = useState([]);

  // Category Manager State
  const [newCatName, setNewCatName] = useState('');

  // Variant Form State
  const [variantName, setVariantName] = useState('');
  const [variantPrice, setVariantPrice] = useState('');

  const safeBottom = Platform.OS === 'ios' ? insets.bottom : 10;
  const bottomPadding = 100 + safeBottom;

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    const items = await loadMenu();
    setMenuItems(items);
    const cats = await loadCategories();
    setCategories(cats);
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchText(searchText);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchText]);

  const filteredMenu = useMemo(() => {
    return menuItems.filter(item => {
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
      const matchesSearch = item.name.toLowerCase().includes(debouncedSearchText.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [menuItems, selectedCategory, debouncedSearchText]);

  // --- CATEGORY MANAGEMENT ---
  const addCategory = async () => {
    if (!newCatName.trim()) return;
    if (categories.includes(newCatName.trim())) {
      Alert.alert('Error', 'Category already exists');
      return;
    }
    const updatedCats = [...categories, newCatName.trim()];
    setCategories(updatedCats);
    await saveCategories(updatedCats);
    setNewCatName('');
  };

  const removeCategory = async (catToDelete) => {
    if (catToDelete === 'All') return; // Protect 'All'
    Alert.alert('Delete Category', `Are you sure you want to delete "${catToDelete}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
          const updatedCats = categories.filter(c => c !== catToDelete);
          setCategories(updatedCats);
          await saveCategories(updatedCats);
          // If current selection was deleted, switch to All
          if (selectedCategory === catToDelete) setSelectedCategory('All');
      }}
    ]);
  };

  // --- IMAGE LOGIC ---
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission', 'Allow photos access'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.7,
    });
    if (!result.canceled) setItemImage(result.assets[0].uri);
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission', 'Allow camera access'); return; }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true, aspect: [1, 1], quality: 0.7,
    });
    if (!result.canceled) setItemImage(result.assets[0].uri);
  };

  const showImageOptions = () => {
    Alert.alert('Add Image', 'Choose an option', [
      { text: 'Camera', onPress: takePhoto },
      { text: 'Gallery', onPress: pickImage },
      { text: 'Remove', onPress: () => setItemImage(null), style: 'destructive' },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const savePermanentImage = async (uri) => {
    if (!uri) return null;
    if (uri.includes(FileSystem.documentDirectory)) return uri;
    try {
        const filename = uri.split('/').pop();
        const newPath = FileSystem.documentDirectory + filename;
        await FileSystem.copyAsync({ from: uri, to: newPath });
        return newPath;
    } catch (error) { return uri; }
  };

  // --- MODAL CONTROLS ---
  const openAddModal = () => {
    setEditingItem(null); setItemName(''); setItemPrice(''); 
    // Default to first non-All category
    const defaultCat = categories.length > 1 ? categories[1] : 'General';
    setItemCategory(defaultCat);
    setItemImage(null); setHasVariants(false); setVariants([]); setModalVisible(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item); setItemName(item.name); setItemPrice(item.price.toString());
    setItemCategory(item.category); setItemImage(item.image); setHasVariants(!!item.hasVariants);
    setVariants(item.variants || []); setModalVisible(true);
  };

  const openVariantModal = (variant = null, index = -1) => {
    setEditingVariant(variant); setEditingVariantIndex(index);
    if (variant) { setVariantName(variant.name); setVariantPrice(variant.price.toString()); } 
    else { setVariantName(''); setVariantPrice(''); }
    setVariantModalVisible(true);
  };

  // --- SAVE / DELETE ---
  const saveVariant = () => {
    if (!variantName.trim() || !variantPrice || isNaN(parseFloat(variantPrice))) return;
    const newVariant = { id: editingVariant?.id || `v${Date.now()}`, name: variantName.trim(), price: parseFloat(variantPrice) };
    const updated = [...variants];
    if (editingVariantIndex >= 0) updated[editingVariantIndex] = newVariant;
    else updated.push(newVariant);
    setVariants(updated);
    setVariantModalVisible(false);
  };

  const saveItem = async () => {
    if (!itemName.trim() || !itemPrice || isNaN(parseFloat(itemPrice))) {
      Alert.alert(t('error'), t('enterValidPrice')); return;
    }
    let permanentImageUri = null;
    if (itemImage) permanentImageUri = await savePermanentImage(itemImage);

    const newItem = {
      id: editingItem?.id || Date.now().toString(),
      name: itemName.trim(),
      price: parseFloat(itemPrice),
      category: itemCategory,
      image: permanentImageUri,
      hasVariants,
      variants: hasVariants ? variants : [],
    };

    const updatedMenu = editingItem ? menuItems.map((i) => (i.id === editingItem.id ? newItem : i)) : [...menuItems, newItem];
    await saveMenu(updatedMenu);
    setMenuItems(updatedMenu);
    setModalVisible(false);
  };

  const deleteItem = (item) => {
    Alert.alert(t('deleteItem'), t('deleteConfirm'), [
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
        style={[styles.menuCard, { width: cardWidth, margin: 5, backgroundColor: theme.card }]} 
        onPress={() => openEditModal(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardImageContainer}>
          {item.image ? (
            <Image source={{ uri: item.image }} style={[styles.cardImage, { height: dynamicImageHeight }]} />
          ) : (
            <View style={[styles.cardPlaceholder, { height: dynamicImageHeight, backgroundColor: isDark ? '#333' : '#f0f0f0' }]}>
              <Text style={{ fontSize: isLandscape ? 28 : 36 }}>🍽️</Text>
            </View>
          )}
          <TouchableOpacity style={styles.deleteBadge} onPress={() => deleteItem(item)}>
            <Ionicons name="trash" size={12} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={styles.cardInfo}>
          <Text style={[styles.cardName, { color: theme.text }]} numberOfLines={1}>{item.name}</Text>
          <Text style={[styles.cardPrice, { color: theme.primary }]}>₹{item.price.toFixed(0)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const inputStyle = [styles.input, { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.border }];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.searchBarContainer, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <View style={[styles.searchWrapper, { backgroundColor: theme.inputBackground }]}>
          <Ionicons name="search" size={20} color={theme.textSecondary} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder={t('enterItemName')}
            placeholderTextColor={theme.textSecondary}
            value={searchText}
            onChangeText={setSearchText} 
          />
          {searchText !== '' && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Ionicons name="close-circle" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryContent}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryButton, 
                selectedCategory === category 
                  ? { backgroundColor: theme.primary } 
                  : { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }
              ]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text style={[styles.categoryText, selectedCategory === category ? { color: '#fff' } : { color: theme.text }]}>
                {getCategoryName(category)}
              </Text>
            </TouchableOpacity>
          ))}
          {/* EDIT CATEGORIES BUTTON */}
          <TouchableOpacity 
             style={[styles.categoryButton, { backgroundColor: theme.inputBackground, borderWidth: 1, borderColor: theme.border, borderStyle: 'dashed' }]}
             onPress={() => setCatManagerVisible(true)}
          >
             <Text style={{ color: theme.primary, fontWeight: 'bold' }}>+ Edit</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <Text style={[styles.itemCount, { color: theme.textSecondary }]}>
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
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            {debouncedSearchText ? "No items match your search" : t('noItemsCategory')}
          </Text>
        }
      />

      <View style={[styles.addButtonContainer, { bottom: safeBottom + 10 }]}>
        <TouchableOpacity style={[styles.addButton, { backgroundColor: theme.primary }]} onPress={openAddModal}>
          <Text style={styles.addButtonText}>+ {t('addNewItem')}</Text>
        </TouchableOpacity>
      </View>

      {/* ITEM MODAL */}
      <Modal visible={modalVisible} animationType="slide" transparent={true} onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>{editingItem ? t('editItem') : t('addNewItem')}</Text>
              
              <TouchableOpacity style={[styles.imagePicker, { backgroundColor: theme.inputBackground }]} onPress={showImageOptions}>
                {itemImage ? (
                  <Image source={{ uri: itemImage }} style={styles.imagePreview} />
                ) : (
                  <Text style={{ color: theme.textSecondary }}>📸 Tap to add image</Text>
                )}
              </TouchableOpacity>

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>{t('itemName')}</Text>
              <TextInput style={inputStyle} value={itemName} onChangeText={setItemName} placeholder={t('enterItemName')} placeholderTextColor={theme.textSecondary} />

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>{t('price')}</Text>
              <TextInput style={inputStyle} value={itemPrice} onChangeText={setItemPrice} keyboardType="numeric" placeholderTextColor={theme.textSecondary} />

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>{t('category')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.categoryChipsContainer}>
                  {categories.filter(c => c !== 'All').map(cat => (
                    <TouchableOpacity 
                      key={cat} 
                      style={[styles.categoryChip, itemCategory === cat ? { backgroundColor: theme.primary } : { backgroundColor: theme.inputBackground, borderWidth: 1, borderColor: theme.border }]} 
                      onPress={() => setItemCategory(cat)}
                    >
                      <Text style={[styles.categoryChipText, { color: itemCategory === cat ? '#fff' : theme.text }]}>{getCategoryName(cat)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
              
              {/* REST OF MODAL (VARIANTS, SAVE) */}
              <View style={styles.variantToggle}>
                <Text style={[styles.inputLabel, { color: theme.text }]}>Has Variants?</Text>
                <Switch value={hasVariants} onValueChange={setHasVariants} trackColor={{ false: theme.border, true: theme.primary }} />
              </View>

              {hasVariants && (
                <View style={[styles.variantsSection, { backgroundColor: theme.inputBackground }]}>
                  <Text style={{ fontWeight: 'bold', marginBottom: 10, color: theme.text }}>Variants ({variants.length})</Text>
                  {variants.map((v, idx) => (
                    <View key={v.id} style={[styles.variantRow, { borderBottomColor: theme.border }]}>
                      <Text style={{ flex: 1, color: theme.text }}>{v.name} - ₹{v.price}</Text>
                      <TouchableOpacity onPress={() => { const u = variants.filter((_, i) => i !== idx); setVariants(u); }}>
                         <Ionicons name="trash" size={20} color="#ff4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                  <TouchableOpacity style={[styles.addVarBtn, { backgroundColor: '#4CAF50' }]} onPress={() => openVariantModal()}>
                    <Text style={{ color: '#fff' }}>+ Add Variant</Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                  <Text style={{ color: theme.text }}>{t('cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.saveBtn, { backgroundColor: theme.primary }]} onPress={saveItem}>
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>{t('save')}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* CATEGORY MANAGER MODAL (NEW) */}
      <Modal 
        visible={catManagerVisible} 
        animationType="slide" 
        transparent={true}
        onRequestClose={() => setCatManagerVisible(false)} // Fix for Android Back Button Crash
      >
         <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.card, maxHeight: '80%' }]}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Manage Categories</Text>
                <ScrollView style={{ marginBottom: 20 }}>
                    {categories.filter(c => c !== 'All').map(cat => (
                        <View key={cat} style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 15, borderBottomWidth: 1, borderBottomColor: theme.border }}>
                            <Text style={{ color: theme.text, fontSize: 16 }}>{cat}</Text>
                            <TouchableOpacity onPress={() => removeCategory(cat)}>
                                <Ionicons name="trash-outline" size={20} color="#ff4444" />
                            </TouchableOpacity>
                        </View>
                    ))}
                </ScrollView>
                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                    <TextInput 
                        style={[inputStyle, { flex: 1, marginBottom: 0 }]} 
                        placeholder="New Category" 
                        placeholderTextColor={theme.textSecondary}
                        value={newCatName}
                        onChangeText={setNewCatName}
                    />
                    <TouchableOpacity style={{ backgroundColor: theme.primary, padding: 12, borderRadius: 10 }} onPress={addCategory}>
                        <Ionicons name="add" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>
                <TouchableOpacity style={{ marginTop: 15, alignSelf: 'center' }} onPress={() => setCatManagerVisible(false)}>
                    <Text style={{ color: theme.primary }}>Done</Text>
                </TouchableOpacity>
            </View>
         </KeyboardAvoidingView>
      </Modal>

      {/* VARIANT MODAL */}
      <Modal visible={variantModalVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { width: '80%', backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>{editingVariant ? 'Edit Variant' : 'Add Variant'}</Text>
            <TextInput style={inputStyle} value={variantName} onChangeText={setVariantName} placeholder="Variant Name" placeholderTextColor={theme.textSecondary}/>
            <TextInput style={inputStyle} value={variantPrice} onChangeText={setVariantPrice} placeholder="Price" keyboardType="numeric" placeholderTextColor={theme.textSecondary}/>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={{ flex: 1, padding: 15, alignItems: 'center' }} onPress={() => setVariantModalVisible(false)}>
                <Text style={{ color: theme.text }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, { flex: 1, backgroundColor: theme.primary }]} onPress={saveVariant}>
                <Text style={{ color: '#fff' }}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchBarContainer: { padding: 10, borderBottomWidth: 1 },
  searchWrapper: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, paddingHorizontal: 15, height: 45 },
  searchInput: { flex: 1, fontSize: 15 },
  categoryContent: { paddingHorizontal: 10, alignItems: 'center', height: 60 },
  categoryButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8 },
  categoryText: { fontWeight: '600' },
  itemCount: { paddingHorizontal: 15, paddingVertical: 8, fontSize: 12 },
  menuCard: { borderRadius: 12, elevation: 3, overflow: 'hidden' },
  cardImageContainer: { position: 'relative' },
  cardImage: { width: '100%', resizeMode: 'cover' },
  cardPlaceholder: { width: '100%', justifyContent: 'center', alignItems: 'center' },
  deleteBadge: { position: 'absolute', top: 5, right: 5, backgroundColor: 'rgba(255,0,0,0.7)', borderRadius: 12, width: 24, height: 24, justifyContent: 'center', alignItems: 'center' },
  cardInfo: { padding: 10 },
  cardName: { fontSize: 14, fontWeight: 'bold' },
  cardPrice: { fontWeight: 'bold', marginTop: 2 },
  addButtonContainer: { position: 'absolute', left: 20, right: 20 },
  addButton: { padding: 16, borderRadius: 12, alignItems: 'center', elevation: 5 },
  addButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  emptyText: { textAlign: 'center', marginTop: 50 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { borderRadius: 20, padding: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  imagePicker: { height: 120, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  imagePreview: { width: '100%', height: '100%', borderRadius: 12 },
  inputLabel: { fontSize: 14, marginBottom: 5, marginTop: 10 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 15 },
  categoryChipsContainer: { flexDirection: 'row', paddingVertical: 5 },
  categoryChip: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, marginRight: 8 },
  categoryChipText: { fontSize: 13 },
  variantToggle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  variantsSection: { padding: 10, borderRadius: 10, marginBottom: 15 },
  variantRow: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, alignItems: 'center' },
  addVarBtn: { padding: 10, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  cancelBtn: { flex: 1, padding: 15, alignItems: 'center' },
  saveBtn: { flex: 1, padding: 15, borderRadius: 10, alignItems: 'center' }
});