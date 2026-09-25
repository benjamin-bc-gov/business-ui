import { cloneDeep } from 'es-toolkit'

export const useAgmLocationChangeStore = defineStore('agm-location-change-store', () => {
  const { initFiling, createFilingPayload } = useFiling()

  const service = useBusinessService()
  const businessStore = useBusinessStore()

  const isStaff = useIsStaff()

  const formState = reactive<AgmLocationChangeFormSchema>(
    getAgmLocationChangeSchema(isStaff.value).parse({})
  )
  const initialFormState = shallowRef<AgmLocationChangeFormSchema>({} as AgmLocationChangeFormSchema)
  const initializing = ref<boolean>(false)
  const draftFilingState = shallowRef<AgmLocationChangeDraftState>({} as AgmLocationChangeDraftState)

  async function init(businessId: string, draftId?: string) {
    initializing.value = true
    $reset()

    const { draftFiling } = await initFiling<AgmLocationChangeFiling>(
      businessId,
      FilingType.AGM_LOCATION_CHANGE,
      undefined,
      draftId
    )

    if (draftFiling?.filing?.agmLocationChange) {
      draftFilingState.value = draftFiling
      const draft = draftFiling.filing.agmLocationChange
      formState.year = draft.year ?? ''
      formState.reason = draft.reason ?? ''
      formState.agmLocation = draft.agmLocation ?? ''

      if (isStaff.value) {
        formState.staffPayment = formatStaffPaymentUi(draftFiling.filing.header)
      } else {
        if (formState.folio) {
          formState.folio.folioNumber = draftFiling.filing.header.folioNumber ?? ''
        }
      }
    }

    await nextTick()
    initialFormState.value = cloneDeep(formState)
    initializing.value = false
  }

  async function submit(isSubmission: boolean) {
    const agmLocationChangePayload: AgmLocationChangePayload = {
      year: formState.year,
      reason: formState.reason,
      agmLocation: formState.agmLocation
    }

    const filingPayload = createFilingPayload<AgmLocationChangeFiling>(
      businessStore.business!,
      FilingType.AGM_LOCATION_CHANGE,
      { agmLocationChange: agmLocationChangePayload },
      {
        ...(isStaff.value
          ? formatStaffPaymentApi(formState.staffPayment!)
          : { folioNumber: (formState as any).folio?.folioNumber }
        )
      }
    )

    const draftId = draftFilingState.value?.filing?.header?.filingId
    if (draftId || !isSubmission) {
      const filingResp = await service.saveOrUpdateDraftFiling<AgmLocationChangeFiling>(
        businessStore.businessIdentifier!,
        filingPayload,
        isSubmission,
        draftId as string | number
      )
      draftFilingState.value = filingResp as unknown as AgmLocationChangeDraftState
    } else {
      await service.postFiling(businessStore.businessIdentifier!, filingPayload)
    }
  }

  function $reset() {
    const defaults = getAgmLocationChangeSchema(isStaff.value).parse({})
    Object.assign(formState, defaults)
    initialFormState.value = cloneDeep(formState)
    draftFilingState.value = {} as AgmLocationChangeDraftState
  }

  return {
    formState,
    initializing,
    initialFormState,
    isStaff,
    init,
    submit,
    $reset
  }
})
