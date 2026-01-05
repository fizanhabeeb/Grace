// src/components/ErrorBoundary.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service here
    console.error("Uncaught Error:", error, errorInfo);
  }

  handleRestart = () => {
    // Resetting state will attempt to re-render the app
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.content}>
            <Ionicons name="warning" size={80} color="#ff5252" />
            <Text style={styles.title}>Oops! Something went wrong.</Text>
            <Text style={styles.subtitle}>
              Don't worry, your data is safe. This is just a temporary glitch.
            </Text>
            
            <View style={styles.errorBox}>
              <Text style={styles.errorLabel}>Error Details:</Text>
              <ScrollView style={styles.scroll}>
                <Text style={styles.errorText}>{this.state.error?.toString()}</Text>
              </ScrollView>
            </View>

            <TouchableOpacity style={styles.button} onPress={this.handleRestart}>
              <Text style={styles.buttonText}>🔄 Restart App</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  errorBox: {
    width: '100%',
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 10,
    marginBottom: 30,
    maxHeight: 200,
  },
  errorLabel: {
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  scroll: {
    maxHeight: 150,
  },
  errorText: {
    color: '#ff5252',
    fontFamily: 'monospace',
    fontSize: 12,
  },
  button: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});