type SalesEventListener = () => void;

class SalesEventBus {
  private listeners: Set<SalesEventListener> = new Set();
  private revision = 0;

  public subscribe(listener: SalesEventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public notifySaleCompleted(): void {
    this.revision += 1;
    this.listeners.forEach((fn) => {
      try {
        fn();
      } catch (err) {
        console.error('Error in sales listener:', err);
      }
    });
  }

  public getRevision(): number {
    return this.revision;
  }
}

export const salesEventBus = new SalesEventBus();
