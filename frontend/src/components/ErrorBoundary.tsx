import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    console.error('🔴 ErrorBoundary caught error:', error);
    return { 
      hasError: true, 
      error,
      errorInfo: null 
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('🔴 ErrorBoundary details:', {
      error: error.toString(),
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorBoundary: errorInfo
    });
    
    // Сохраняем в localStorage для отладки
    try {
      localStorage.setItem('lastError', JSON.stringify({
        message: error.toString(),
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString()
      }));
    } catch (e) {
      console.error('Failed to save error to localStorage:', e);
    }
    
    this.setState({
      error,
      errorInfo
    });
  }

  private handleReset = () => {
    localStorage.removeItem('lastError');
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          backgroundColor: '#1a1a2e',
          color: 'white',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          fontFamily: 'monospace'
        }}>
          <div style={{
            maxWidth: '600px',
            width: '100%',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '10px',
            padding: '30px',
            backdropFilter: 'blur(10px)'
          }}>
            <h1 style={{ fontSize: '24px', marginBottom: '20px', color: '#ff6b6b' }}>
              ⚠️ Произошла ошибка
            </h1>
            
            <div style={{
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              padding: '15px',
              borderRadius: '5px',
              marginBottom: '20px',
              fontSize: '14px',
              wordBreak: 'break-all'
            }}>
              <strong>Ошибка:</strong><br/>
              {this.state.error && this.state.error.toString()}
            </div>
            
            {this.state.error?.stack && (
              <details style={{ marginBottom: '20px' }}>
                <summary style={{ cursor: 'pointer', marginBottom: '10px' }}>
                  📋 Stack trace (нажмите для просмотра)
                </summary>
                <pre style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.3)',
                  padding: '10px',
                  borderRadius: '5px',
                  fontSize: '12px',
                  overflow: 'auto',
                  maxHeight: '300px'
                }}>
                  {this.state.error.stack}
                </pre>
              </details>
            )}
            
            <button
              onClick={this.handleReset}
              style={{
                backgroundColor: '#00d4ff',
                color: '#000',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '5px',
                fontSize: '16px',
                cursor: 'pointer',
                fontWeight: 'bold',
                width: '100%'
              }}
            >
              🔄 Перезагрузить приложение
            </button>
            
            <div style={{
              marginTop: '20px',
              fontSize: '12px',
              opacity: 0.7,
              textAlign: 'center'
            }}>
              Если ошибка повторяется, попробуйте очистить кеш браузера (Ctrl+Shift+R)
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}