import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PageContainer } from '../components/shell/PageContainer';
import { PageHeader } from '../components/shell/PageHeader';
import { useAuth } from '../context/AuthContext';
import { useCountry } from '../context/CountryContext';
import { repositoryFactory } from '../infrastructure/repositories/RepositoryFactory';
import { CurrencyCode } from '../types/country';
import { CashSession, CashSessionSummary } from '../domain/cash/CashSession';
import { CashMovement } from '../domain/cash/CashMovement';
import { CashRegister } from '../domain/cash/CashRegister';
import { CashStatusHeader } from '../features/cash/components/CashStatusHeader';
import { CashKpiCards } from '../features/cash/components/CashKpiCards';
import { CashMovementsTable } from '../features/cash/components/CashMovementsTable';
import { CashSessionsTable } from '../features/cash/components/CashSessionsTable';
import { OpenCashModal } from '../features/cash/components/OpenCashModal';
import { AddCashMovementModal } from '../features/cash/components/AddCashMovementModal';
import { CloseCashBlindModal } from '../features/cash/components/CloseCashBlindModal';
import { CashSessionDetailModal } from '../features/cash/components/CashSessionDetailModal';
import { OpenCashSession } from '../application/cash/OpenCashSession';
import { CloseCashSession } from '../application/cash/CloseCashSession';
import { AddCashMovement } from '../application/cash/AddCashMovement';
import { GetCashSessionDetail, CashSessionDetailResult } from '../application/cash/GetCashSessionDetail';
import { EnsureDefaultCashRegister } from '../application/cash/EnsureDefaultCashRegister';

export const CashPage: React.FC = () => {
  const { activeOwnerName } = useAuth();
  const { country } = useCountry();
  const currency = country.primaryCurrency.code as CurrencyCode;
  const businessId = 'primary-business';
  const userId = 'primary-user';
  const userName = activeOwnerName || 'Cajero';

  // Repositories & Use Cases
  const registerRepo = useMemo(() => repositoryFactory.getCashRegisterRepository(), []);
  const sessionRepo = useMemo(() => repositoryFactory.getCashSessionRepository(), []);
  const queryRepo = useMemo(() => repositoryFactory.getCashQueryRepository(), []);

  const openCashUseCase = useMemo(
    () => new OpenCashSession(sessionRepo, registerRepo),
    [sessionRepo, registerRepo]
  );
  const closeCashUseCase = useMemo(
    () => new CloseCashSession(sessionRepo),
    [sessionRepo]
  );
  const addMovementUseCase = useMemo(
    () => new AddCashMovement(sessionRepo),
    [sessionRepo]
  );
  const detailUseCase = useMemo(
    () => new GetCashSessionDetail(sessionRepo, queryRepo),
    [sessionRepo, queryRepo]
  );
  const ensureRegisterUseCase = useMemo(
    () => new EnsureDefaultCashRegister(registerRepo),
    [registerRepo]
  );

  // State
  const [defaultRegister, setDefaultRegister] = useState<CashRegister | null>(null);
  const [activeSession, setActiveSession] = useState<CashSession | null>(null);
  const [activeSummary, setActiveSummary] = useState<CashSessionSummary | null>(null);
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [historicalSessions, setHistoricalSessions] = useState<CashSession[]>([]);

  // Modals
  const [isOpenCashModalOpen, setIsOpenCashModalOpen] = useState(false);
  const [isAddMovementModalOpen, setIsAddMovementModalOpen] = useState(false);
  const [movementModalType, setMovementModalType] = useState<'CASH_IN' | 'CASH_OUT'>('CASH_IN');
  const [isCloseCashModalOpen, setIsCloseCashModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedSessionDetail, setSelectedSessionDetail] = useState<CashSessionDetailResult | null>(null);

  // Load data
  const loadCashData = useCallback(async () => {
    try {
      const reg = await ensureRegisterUseCase.execute(businessId);
      setDefaultRegister(reg);

      const active = await sessionRepo.getActiveSession(businessId, reg.id);
      setActiveSession(active);

      if (active) {
        const [sum, movs] = await Promise.all([
          queryRepo.getSessionSummary(active.id, businessId),
          sessionRepo.listMovementsBySession(active.id, businessId),
        ]);
        setActiveSummary(sum);
        setMovements(movs);
      } else {
        setActiveSummary(null);
        setMovements([]);
      }

      const { sessions } = await sessionRepo.listSessions(businessId, 50, 0);
      setHistoricalSessions(sessions);
    } catch (err) {
      console.error('Error loading cash data:', err);
    }
  }, [businessId, ensureRegisterUseCase, sessionRepo, queryRepo]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadCashData();
  }, [loadCashData]);

  // Handlers
  const handleOpenCash = async (openingAmount: number, note: string | null) => {
    const res = await openCashUseCase.execute({
      businessId,
      cashRegisterId: defaultRegister?.id,
      openedByUserId: userId,
      openedByNameSnapshot: userName,
      openingAmount,
      currencyCode: currency,
      note,
    });

    if (!res.success) {
      throw new Error(res.error || 'Error al abrir caja');
    }

    await loadCashData();
  };

  const handleAddMovement = async (
    type: 'CASH_IN' | 'CASH_OUT',
    amount: number,
    reason: string,
    note: string | null
  ) => {
    if (!activeSession) throw new Error('No hay una sesión de caja abierta.');

    const res = await addMovementUseCase.execute({
      businessId,
      cashSessionId: activeSession.id,
      movementType: type,
      amount,
      currencyCode: currency,
      reason,
      note,
      createdByUserId: userId,
      createdByNameSnapshot: userName,
    });

    if (!res.success) {
      throw new Error(res.error || 'Error al registrar movimiento');
    }

    await loadCashData();
  };

  const handleCloseCash = async (
    countedAmount: number,
    previewExpectedCash: number,
    note: string | null
  ) => {
    if (!activeSession) throw new Error('No hay una sesión de caja abierta.');

    const res = await closeCashUseCase.execute({
      sessionId: activeSession.id,
      businessId,
      closedByUserId: userId,
      closedByNameSnapshot: userName,
      countedCashAmount: countedAmount,
      previewExpectedCash,
      closingNote: note,
    });

    if (!res.success) {
      throw new Error(res.error || 'Error al cerrar caja');
    }

    await loadCashData();
  };

  const handleViewDetail = async (session: CashSession) => {
    const detail = await detailUseCase.execute(session.id, businessId);
    if (detail) {
      setSelectedSessionDetail(detail);
      setIsDetailModalOpen(true);
    }
  };

  const openCashInModal = () => {
    setMovementModalType('CASH_IN');
    setIsAddMovementModalOpen(true);
  };

  const openCashOutModal = () => {
    setMovementModalType('CASH_OUT');
    setIsAddMovementModalOpen(true);
  };

  return (
    <PageContainer>
      <PageHeader
        title="Caja"
        subtitle="Gestiona apertura, movimientos y cierre del turno operativo."
      />

      <div className="space-y-6">
        {/* Status Header */}
        <CashStatusHeader
          session={activeSession}
          registerName={defaultRegister?.name || 'Caja principal'}
          onOpenCash={() => setIsOpenCashModalOpen(true)}
          onCloseCash={() => setIsCloseCashModalOpen(true)}
          onCashIn={openCashInModal}
          onCashOut={openCashOutModal}
        />

        {/* Active Shift KPIs & Movements */}
        {activeSession && activeSummary && (
          <>
            <CashKpiCards summary={activeSummary} currency={currency} />
            <CashMovementsTable movements={movements} currency={currency} />
          </>
        )}

        {/* Shift History */}
        <CashSessionsTable
          sessions={historicalSessions}
          currency={currency}
          onViewDetail={handleViewDetail}
        />
      </div>

      {/* Modals */}
      <OpenCashModal
        isOpen={isOpenCashModalOpen}
        onClose={() => setIsOpenCashModalOpen(false)}
        onConfirm={handleOpenCash}
        currency={currency}
        userName={userName}
        registerName={defaultRegister?.name || 'Caja principal'}
      />

      <AddCashMovementModal
        isOpen={isAddMovementModalOpen}
        initialType={movementModalType}
        onClose={() => setIsAddMovementModalOpen(false)}
        onConfirm={handleAddMovement}
        currency={currency}
        currentExpectedCash={activeSummary?.expectedCash || activeSession?.openingAmount || 0}
      />

      <CloseCashBlindModal
        isOpen={isCloseCashModalOpen}
        onClose={() => setIsCloseCashModalOpen(false)}
        onConfirmClose={handleCloseCash}
        currency={currency}
        summary={activeSummary}
        userName={userName}
      />

      <CashSessionDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        detail={selectedSessionDetail}
        currency={currency}
      />
    </PageContainer>
  );
};
