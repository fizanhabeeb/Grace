// src/screens/OrderScreen.js
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView, Image, Modal, Platform, TextInput } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import useOrientation from '../utils/useOrientation';
import { loadMenu, saveActiveTableOrder, getActiveTableOrder } from '../utils/storage'; // UPDATED IMPORTS

export default function OrderScreen({ navigation, route }) {
  const { t, getCategoryName } = useLanguage();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { isLandscape, numColumns, cardWidth, isTablet } = useOrientation();

  // GET TABLE NUMBER FROM PARAMS (Default to 'Counter' if missing)
  const { tableNo } = route.params || { tableNo: 'Counter' };
  
  const [menuItems, setMenuItems] = useState([]);
  const [orderItems, setOrderItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchText, setSearchText] = useState('');
  const [debouncedSearchText, setDebouncedSearchText] = useState('');
  const [variantModalVisible, setVariantModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const categories = ['All', 'Breakfast', 'Rice', 'Curry', 'Snacks', 'Beverages'];
  const safeBottom = Platform.OS === 'ios' ? insets.bottom : 10;
  const orderBarHeight = isLandscape ? 120 : 180;
  const bottomPadding = orderItems.length > 0 ? orderBarHeight + safeBottom + 20 : 20;

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [tableNo]) // Re-load if table changes
  );

  const loadData = async () => {
    const menu = await loadMenu();
    setMenuItems(menu);
    // Load Specific Table Order
    const currentOrder = await getActiveTableOrder(tableNo);
    setOrderItems(currentOrder);
  };

  useEffect(() => {
    const handler = setTimeout(() => { setDebouncedSearchText(searchText); }, 300);
    return () => clearTimeout(handler);
  }, [searchText]);

  const filteredMenu = useMemo(() => {
    return menuItems.filter(item => {
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
      const matchesSearch = item.name.toLowerCase().includes(debouncedSearchText.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [menuItems, selectedCategory, debouncedSearchText]);

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
    await saveActiveTableOrder(tableNo, updatedOrder); // SAVE TO TABLE
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
      await saveActiveTableOrder(tableNo, updatedOrder); // SAVE TO TABLE
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
        style={[styles.menuCard, { width: cardWidth, margin: 5, backgroundColor: theme.card }]}
        onPress={() => handleItemClick(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardImageContainer}>
          {item.image ? (
            <Image source={{ uri: item.image }} style={[styles.cardImage, { height: dynamicImageHeight }]} />
          ) : (
            <View style={[styles.cardPlaceholder, { height: dynamicImageHeight, backgroundColor: theme.inputBackground }]}>
              <Text style={{ fontSize: isLandscape ? 28 : 36 }}>🍽️</Text>
            </View>
          )}
          {quantity > 0 && (
            <View style={[styles.quantityBadge, { backgroundColor: theme.primary }]}>
              <Text style={styles.quantityBadgeText}>{quantity}</Text>
            </View>
          )}
        </View>
        <View style={styles.cardInfo}>
          <Text style={[styles.cardName, { color: theme.text, fontSize: isTablet ? 16 : 13 }]} numberOfLines={1}>{item.name}</Text>
          <Text style={[styles.cardPrice, { color: theme.primary, fontSize: isTablet ? 16 : 14 }]}>₹{item.price.toFixed(0)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      
      {/* Search Bar with Table Info */}
      <View style={[styles.searchBarContainer, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
           <Text style={{ color: theme.primary, fontWeight: 'bold', fontSize: 16 }}>Table: {tableNo}</Text>
           <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 5 }}>
             <Text style={{ color: theme.textSecondary }}>Close</Text>
           </TouchableOpacity>
        </View>
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

      {/* Category List */}
      <View style={{ height: 60 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryContent}>
          {categories.map(category => (
            <TouchableOpacity
              key={category}
              style={[styles.categoryButton, selectedCategory === category ? { backgroundColor: theme.primary } : { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text style={[styles.categoryText, { color: selectedCategory === category ? '#fff' : theme.text }]}>{getCategoryName(category)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Grid List */}
      <FlatList
        data={filteredMenu}
        renderItem={renderMenuItem}
        keyExtractor={item => item.id}
        numColumns={numColumns}
        key={numColumns} 
        contentContainerStyle={{ paddingBottom: bottomPadding }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<Text style={[styles.emptyText, { color: theme.textSecondary }]}>{debouncedSearchText ? "No matches found" : t('noItemsAvailable')}</Text>}
      />

      {/* Cart Summary Bar */}
      {orderItems.length > 0 && (
        <View style={[styles.orderBar, { paddingBottom: safeBottom + 10, backgroundColor: theme.card, borderColor: theme.border }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
            {orderItems.map(item => (
              <View key={item.orderId} style={[styles.cartItem, { backgroundColor: theme.inputBackground }]}>
                <Text style={[styles.cartItemName, { color: theme.text }]}>{item.name} x{item.quantity}</Text>
                <View style={{ flexDirection: 'row' }}>
                  <TouchableOpacity onPress={() => removeFromOrder(item.orderId)} style={[styles.smallBtn, { backgroundColor: theme.card }]}><Text style={{ color: theme.text }}>−</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => addToOrder({ id: item.id, image: item.image }, item.name, item.price)} style={[styles.smallBtn, { backgroundColor: theme.card }]}><Text style={{ color: theme.text }}>+</Text></TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>
          <TouchableOpacity 
            style={[styles.billButton, { backgroundColor: theme.primary }]} 
            onPress={() => navigation.navigate('Bill', { tableNo: tableNo })} // PASS TABLE NO TO BILL
          >
            <Text style={styles.billButtonText}>{t('viewBillArrow')} (₹{orderItems.reduce((s, i) => s + (i.price * i.quantity), 0).toFixed(2)})</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Variant Modal (Keep existing) */}
      <Modal visible={variantModalVisible} animationType="slide" transparent={true}>
          <View style={styles.variantModalOverlay}>
              <View style={[styles.variantModalContent, { backgroundColor: theme.card }]}>
                  {selectedItem && (
                      <>
                        <Text style={[styles.modalTitle, { color: theme.text }]}>{selectedItem.name}</Text>
                        <TouchableOpacity style={[styles.variantOption, { borderBottomColor: theme.border }]} onPress={() => addToOrder(selectedItem, selectedItem.name, selectedItem.price)}>
                            <Text style={{ color: theme.text }}>{selectedItem.name} (Regular)</Text>
                            <Text style={{ color: theme.primary, fontWeight: 'bold' }}>₹{selectedItem.price}</Text>
                        </TouchableOpacity>
                        {selectedItem.variants.map(v => (
                            <TouchableOpacity key={v.id} style={[styles.variantOption, { borderBottomColor: theme.border }]} onPress={() => addToOrder(selectedItem, v.name, v.price)}>
                                <Text style={{ color: theme.text }}>{v.name}</Text>
                                <Text style={{ color: theme.primary, fontWeight: 'bold' }}>₹{v.price}</Text>
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity onPress={() => setVariantModalVisible(false)} style={styles.closeBtn}>
                            <Text style={{ color: theme.textSecondary }}>Cancel</Text>
                        </TouchableOpacity>
                      </>
                  )}
              </View>
          </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchBarContainer: { padding: 10, borderBottomWidth: 1 },
  searchWrapper: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, paddingHorizontal: 15, height: 40 },
  searchInput: { flex: 1, fontSize: 14 },
  categoryContent: { paddingHorizontal: 10, alignItems: 'center' },
  categoryButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8 },
  categoryText: { fontWeight: '600' },
  menuCard: { borderRadius: 12, elevation: 3, overflow: 'hidden' },
  cardImageContainer: { position: 'relative' },
  cardImage: { width: '100%', resizeMode: 'cover' },
  cardPlaceholder: { width: '100%', justifyContent: 'center', alignItems: 'center' },
  quantityBadge: { position: 'absolute', top: 5, right: 5, borderRadius: 12, width: 24, height: 24, justifyContent: 'center', alignItems: 'center' },
  quantityBadgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  cardInfo: { padding: 8 },
  cardName: { fontSize: 13, fontWeight: 'bold' },
  cardPrice: { marginTop: 2, fontWeight: 'bold' },
  orderBar: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopWidth: 1, padding: 10 },
  cartItem: { padding: 8, borderRadius: 8, marginRight: 10, flexDirection: 'row', alignItems: 'center' },
  cartItemName: { marginRight: 8, fontSize: 12 },
  smallBtn: { padding: 5, borderRadius: 5, marginLeft: 5 },
  billButton: { padding: 12, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  billButtonText: { color: '#fff', fontWeight: 'bold' },
  emptyText: { textAlign: 'center', marginTop: 50 },
  variantModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  variantModalContent: { borderRadius: 20, padding: 20, width: '85%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  variantOption: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, borderBottomWidth: 1 },
  closeBtn: { marginTop: 15, alignItems: 'center', padding: 10 },
});