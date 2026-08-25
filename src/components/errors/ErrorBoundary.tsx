import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RefreshCw } from 'lucide-react';
import { Button } from '../ui/Button';
import { logger } from '../../infrastructure/logging/Logger';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('ErrorBoundary', 'Unhandled React render exception', {
      error: error.message,
      componentStack: errorInfo.componentStack ?? undefined,
    });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-background text-text-primary flex items-center justify-center p-6 select-none">
          <div className="w-full max-w-md bg-surface border border-border-default rounded-[var(--radius-modal)] p-6 text-center space-y-4 shadow-[var(--shadow-elevated)]">
            <div className="w-12 h-12 rounded-full bg-status-danger-bg text-status-danger mx-auto flex items-center justify-center">
              <AlertOctagon size={24} />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-text-primary">Ha ocurrido un error inesperado</h2>
              <p className="text-xs text-text-secondary">
                Ocurrió un problema en la interfaz de SevenPOS. Puede reiniciar la vista para continuar.
              </p>
            </div>
            <Button
              variant="brand"
              size="md"
              leftIcon={<RefreshCw size={15} />}
              onClick={this.handleReset}
              className="w-full font-semibold"
            >
              Reiniciar aplicación
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
