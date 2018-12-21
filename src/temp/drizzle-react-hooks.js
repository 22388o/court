import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'
import PropTypes from 'prop-types'
import shallowequal from 'shallowequal'

const Context = createContext()
export const useDrizzle = () => useContext(Context)
export const useDrizzleState = mapState => {
  const { drizzle } = useDrizzle()
  const [state, setState] = useState(mapState(drizzle.store.getState()))
  const stateRef = useRef(state)
  useEffect(
    () =>
      drizzle.store.subscribe(() => {
        const newState = mapState(drizzle.store.getState())
        if (!shallowequal(stateRef.current, newState)) {
          stateRef.current = newState
          setState(newState)
        }
      }),
    [drizzle.store]
  )
  return state
}

export const DrizzleProvider = ({ children, drizzle }) => {
  const cacheCall = useCallback(
    (contractName, methodName, ...args) => {
      const cacheKey = drizzle.contracts[contractName].methods[
        methodName
      ].cacheCall(...args)
      const drizzleState = drizzle.store.getState()
      return (
        drizzleState.contracts[contractName][methodName][cacheKey] &&
        drizzleState.contracts[contractName][methodName][cacheKey].value
      )
    },
    [drizzle.contracts, drizzle.store]
  )
  const useCacheSend = useCallback(
    (contractName, methodName) => {
      const [stackIDs, setStackIDs] = useState([])
      const drizzleState = drizzle.store.getState()
      return {
        send: (...args) =>
          setStackIDs(stackIDs => [
            ...stackIDs,
            drizzle.contracts[contractName].methods[methodName].cacheSend(
              ...args
            )
          ]),
        transactions: stackIDs.map(
          stackID =>
            drizzleState.transactions[drizzleState.transactionStack[stackID]]
        )
      }
    },
    [drizzle.contracts, drizzle.store]
  )
  const useCacheEvents = useCallback(
    (contractName, eventName, eventOptions) => {
      const [events, setEvents] = useState()
      const contract = useMemo(
        () =>
          new drizzle.web3.eth.Contract(
            drizzle.contracts[contractName].abi,
            drizzle.contracts[contractName].address
          ),
        [contractName]
      )
      useEffect(
        () => {
          contract
            .getPastEvents(eventName, eventOptions)
            .then(pastEvents => setEvents(pastEvents))
          return drizzle.contracts[contractName].events[eventName]({
            ...eventOptions,
            fromBlock: 'latest'
          }).on('data', event => setEvents(events => [...events, event]))
            .unsubscribe
        },
        [contractName, eventName, eventOptions]
      )
      return events
    },
    [drizzle.web3, drizzle.contracts]
  )
  return (
    <Context.Provider
      value={useMemo(
        () => ({
          cacheCall,
          drizzle,
          useCacheEvents,
          useCacheSend
        }),
        [cacheCall, drizzle, useCacheEvents, useCacheSend]
      )}
    >
      {children}
    </Context.Provider>
  )
}

DrizzleProvider.propTypes = {
  children: PropTypes.node.isRequired,
  drizzle: PropTypes.shape({}).isRequired
}

export const Initializer = ({ children }) => {
  const drizzleState = useDrizzleState(drizzleState => ({
    drizzleStatus: drizzleState.drizzleStatus,
    web3: drizzleState.web3
  }))
  if (drizzleState.drizzleStatus.initialized) return children
  if (drizzleState.web3.status === 'initialized')
    return 'Loading contracts and accounts.'
  if (drizzleState.web3.status === 'failed') return 'Error.'
  return 'Loading web3.'
}

Initializer.propTypes = {
  children: PropTypes.node.isRequired
}
