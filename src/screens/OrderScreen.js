// src/screens/OrderScreen.js
import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  Modal,
  Platform,
  TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../context/LanguageContext';
import useOrientation from '../utils/useOrientation';
import { loadMenu, loadCurrentOrder, saveCurrentOrder } from '../utils/storage';

export default function OrderScreen({ navigation }) {
  const { t, getCategoryName } = useLanguage();
  const insets = useSafeAreaInsets();
  const { isLandscape, numColumns, cardWidth } = useOrientation();
  
  const [menuItems, setMenuItems] = useState([]);
  const [orderItems, setOrderItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchText, setSearchText] = useState(''); // Search state preserved
  const [variantModalVisible, setVariantModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const categories = ['All', 'Breakfast', 'Rice', 'Curry', 'Snacks', 'Beverages'];

  const safeBottom = Platform.OS === 'ios' ? insets.bottom : 10;
  const orderBarHeight = isLandscape ? 120 : 180;
  const bottomPadding = orderItems.length > 0 ? orderBarHeight + safeBottom + 20 : 20;

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    const menu = await loadMenu();
    setMenuItems(menu);
    const currentOrder = await loadCurrentOrder();
    setOrderItems(currentOrder);
  };

  // Improved Filtering Logic: Handles both Categories AND Search
  const filteredMenu = useMemo(() => {
    return menuItems.filter(item => {
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
      const matchesSearch = item.name.toLowerCase().includes(searchText.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [menuItems, selectedCategory, searchText]);

  const handleItemClick = (menuItem) => {
    if (menuItem.hasVariants && menuItem.variants.length > 0) {
      setSelectedItem(menuItem);
      setVariantModalVisible(true);
    } else {
      addToOrder(menuItem, menuItem.name, menuItem.price);
    }
  };

  const addToOrder = async (menuItem, itemName, itemPrice) => {
    const orderItemId = `${menuItem.id}-${itemName}`;
    const existingIndex = orderItems.findIndex(item => item.orderId === orderItemId);
    
    let updatedOrder;
    if (existingIndex >= 0) {
      updatedOrder = orderItems.map((item, index) => 
        index === existingIndex ? { ...item, quantity: item.quantity + 1 } : item
      );
    } else {
      updatedOrder = [...orderItems, {
        orderId: orderItemId,
        id: menuItem.id,
        name: itemName,
        price: itemPrice,
        quantity: 1,
        image: menuItem.image,
      }];
    }
    setOrderItems(updatedOrder);
    await saveCurrentOrder(updatedOrder);
    setVariantModalVisible(false);
  };

  const removeFromOrder = async (orderItemId) => {
    const existingIndex = orderItems.findIndex(item => item.orderId === orderItemId);
    if (existingIndex >= 0) {
      const currentItem = orderItems[existingIndex];
      let updatedOrder = currentItem.quantity > 1 
        ? orderItems.map((item, index) => index === existingIndex ? { ...item, quantity: item.quantity - 1 } : item)
        : orderItems.filter((_, index) => index !== existingIndex);
      setOrderItems(updatedOrder);
      await saveCurrentOrder(updatedOrder);
    }
  };

  const getQuantity = (menuItem) => {
    if (menuItem.hasVariants) {
      return orderItems.filter(item => item.id === menuItem.id).reduce((sum, item) => sum + item.quantity, 0);
    }
    const item = orderItems.find(i => i.orderId === `${menuItem.id}-${menuItem.name}`);
    return item ? item.quantity : 0;
  };

  const renderMenuItem = ({ item }) => {
    const quantity = getQuantity(item);
    const dynamicImageHeight = isLandscape ? cardWidth * 0.5 : cardWidth * 0.65;
    return (
      <TouchableOpacity 
        style={[styles.menuCard, { width: cardWidth, margin: 5 }]}
        onPress={() => handleItemClick(item)}
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
          {quantity > 0 && (
            <View style={styles.quantityBadge}>
              <Text style={styles.quantityBadgeText}>{quantity}</Text>
            </View>
          )}
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.cardPrice}>₹{item.price.toFixed(0)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search Bar Section */}
      <View style={styles.searchBarContainer}>
        <View style={styles.searchWrapper}>
          <Text style={{ marginRight: 8 }}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder={t('enterItemName')}
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText !== '' && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={{ height: 60 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryContent}>
          {categories.map(category => (
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

      <FlatList
        data={filteredMenu}
        renderItem={renderMenuItem}
        keyExtractor={item => item.id}
        numColumns={numColumns}
        key={numColumns} 
        contentContainerStyle={{ paddingBottom: bottomPadding }}
        ListEmptyComponent={<Text style={styles.emptyText}>{searchText ? "No matches found" : t('noItemsAvailable')}</Text>}
      />

      {/* Cart Summary Bar with original Controls */}
      {orderItems.length > 0 && (
        <View style={[styles.orderBar, { paddingBottom: safeBottom + 10 }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
            {orderItems.map(item => (
              <View key={item.orderId} style={styles.cartItem}>
                <Text style={styles.cartItemName}>{item.name} x{item.quantity}</Text>
                <View style={{ flexDirection: 'row' }}>
                  <TouchableOpacity onPress={() => removeFromOrder(item.orderId)} style={styles.smallBtn}><Text>−</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => addToOrder({ id: item.id, image: item.image }, item.name, item.price)} style={styles.smallBtn}><Text>+</Text></TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>
          <TouchableOpacity style={styles.billButton} onPress={() => navigation.navigate('Bill')}>
            <Text style={styles.billButtonText}>{t('viewBillArrow')} (₹{orderItems.reduce((s, i) => s + (i.price * i.quantity), 0).toFixed(2)})</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Re-added Variant Modal */}
      <Modal visible={variantModalVisible} animationType="slide" transparent={true}>
          <View style={styles.variantModalOverlay}>
              <View style={styles.variantModalContent}>
                  {selectedItem && (
                      <>
                        <Text style={styles.modalTitle}>{selectedItem.name}</Text>
                        <TouchableOpacity style={styles.variantOption} onPress={() => addToOrder(selectedItem, selectedItem.name, selectedItem.price)}>
                            <Text>{selectedItem.name} (Regular)</Text>
                            <Text>₹{selectedItem.price}</Text>
                        </TouchableOpacity>
                        {selectedItem.variants.map(v => (
                            <TouchableOpacity key={v.id} style={styles.variantOption} onPress={() => addToOrder(selectedItem, v.name, v.price)}>
                                <Text>{v.name}</Text>
                                <Text>₹{v.price}</Text>
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity onPress={() => setVariantModalVisible(false)} style={styles.closeBtn}><Text>Cancel</Text></TouchableOpacity>
                      </>
                  )}
              </View>
          </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  searchBarContainer: { padding: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  searchWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f0f0', borderRadius: 20, paddingHorizontal: 15, height: 40 },
  searchInput: { flex: 1, fontSize: 14 },
  clearIcon: { fontWeight: 'bold', color: '#999', padding: 5 },
  categoryContent: { paddingHorizontal: 10, alignItems: 'center' },
  categoryButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f0f0f0', marginRight: 8 },
  categoryButtonActive: { backgroundColor: '#8B0000' },
  categoryText: { color: '#666', fontWeight: '600' },
  categoryTextActive: { color: '#fff' },
  menuCard: { backgroundColor: '#fff', borderRadius: 12, elevation: 3, overflow: 'hidden' },
  cardImageContainer: { position: 'relative' },
  cardImage: { width: '100%', resizeMode: 'cover' },
  cardPlaceholder: { width: '100%', backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' },
  quantityBadge: { position: 'absolute', top: 5, right: 5, backgroundColor: '#8B0000', borderRadius: 12, width: 24, height: 24, justifyContent: 'center', alignItems: 'center' },
  quantityBadgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  cardInfo: { padding: 8 },
  cardName: { fontSize: 13, fontWeight: 'bold' },
  cardPrice: { color: '#8B0000', marginTop: 2 },
  orderBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#eee', padding: 10 },
  cartItem: { backgroundColor: '#f9f9f9', padding: 8, borderRadius: 8, marginRight: 10, flexDirection: 'row', alignItems: 'center' },
  cartItemName: { marginRight: 8, fontSize: 12 },
  smallBtn: { padding: 5, backgroundColor: '#eee', borderRadius: 5, marginLeft: 5 },
  billButton: { backgroundColor: '#8B0000', padding: 12, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  billButtonText: { color: '#fff', fontWeight: 'bold' },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#999' },
  variantModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  variantModalContent: { backgroundColor: '#fff', borderRadius: 20, padding: 20, width: '85%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  variantOption: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  closeBtn: { marginTop: 15, alignItems: 'center', padding: 10 },
});