import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './components/App'

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(error) { return { error } }
  componentDidCatch(error, info) { console.error('App crashed:', error, info) }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, fontFamily: 'monospace', color: '#b91c1c', whiteSpace: 'pre-wrap' }}>
          <h2>Runtime error (please paste this to me)</h2>
          <pre>{String((this.state.error && this.state.error.stack) || this.state.error)}</pre>
        </div>
      )
    }
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ErrorBoundary><App /></ErrorBoundary>
)
