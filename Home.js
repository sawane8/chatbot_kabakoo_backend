import * as React from 'react';
import DialPad from './DialPad';
import { styles } from '../../Config';
import RnModal from "react-native-modal";
import { useSelector } from 'react-redux';
import { store } from '../../Redux/Store';
import { List, Renvoie, Loading } from '../../';
import { ConfirmationModal } from '../CustomModal';
import { NumericFormat } from 'react-number-format';
import { LinearGradient } from 'expo-linear-gradient';
import { _formatCurrencyToUSD } from '../../Functions';
import { userDataFetch, handleAuthError } from '../../../API/API';
import { Ionicons, MaterialCommunityIcons, Octicons, MaterialIcons } from '@expo/vector-icons';
import { StyleSheet, View, ScrollView, Text, Image, TouchableOpacity, Modal, Dimensions, RefreshControl, DeviceEventEmitter, Alert } from 'react-native';

const { height: fullHeight } = Dimensions.get('window')

const deviceWidth = Dimensions.get("window").width;
const deviceHeight = Dimensions.get("window").height;

export default ({ navigation, route }) => {

  const { token, refreshToken } = useSelector(state => state.security )

  const {ListItems, showBalance, userData } = useSelector(state => state )

  const [ somme, setSomme ] = React.useState(0)
  const [ isRefreshing, setRefreshing ] = React.useState(false)
  const [ modalVisible, setModalVisible ] = React.useState({visible: false, modal: null});
  const [ confirmation, setConfirmation ] = React.useState(false)
  const [ favorisContact, setFavorisContact ] = React.useState([])
  const [ receiver, setReceiver ] = React.useState({'name': null, 'telephoneNumber': null});

  const updateData = (data) => {

    const { transactions } = data
    const elements = transactions?.outgoing.filter((elem, index, self) => self.findIndex((t) => {return (t.receiver_id === elem.receiver_id )}) === index)
    setFavorisContact(elements)
    store.dispatch({ type:'APP_UPDATE', value: data })
    setRefreshing(false)
  }

  const update = (AuthorizationToken = token, refresherToken = refreshToken) => {

    const controller = new AbortController();
    const signal = controller.signal;

    setRefreshing(true);

    userDataFetch(AuthorizationToken, signal)
    .then(res => {
      const { status, ok } = res
      if (res.ok) {
        return res.json()
      }else {
        throw res
      }
    })
    .then(res => {
      updateData(res)
    })
    .catch( async err => {
      if (err instanceof Response) {
        let tokens = await handleAuthError(err, refresherToken)
        if (tokens.token === null && tokens.refreshToken === null) {
          setRefreshing(false)
    			store.dispatch({ type:'DECONNEXION' })
    		} else {
    			store.dispatch({ type:'TOKEN_UPDATE', value: { token: tokens.token, refreshToken: tokens.refreshToken } })
          userDataFetch(tokens.token, signal)
          .then(res => {
            if (res.ok) {
                return res.json()
            }else {
              throw res
            }
          })
          .then(res => {
            updateData(res)
          })
          .catch(err => {
              setRefreshing(false)
              Alert.alert('Erreur connexion', 'Une erreur s\'est produite. Veuillez vérifier que vous êtes bien connecté ou rééssayer plus tard.')
          })
    		}
      } else {
        setRefreshing(false)
        Alert.alert('Erreur connexion', 'Une erreur s\'est produite. Veuillez vérifier que vous êtes bien connecté ou rééssayer plus tard.')
      }
    })

    return () => {
      controller.abort();
      setRefreshing(false)
      setFavorisContact([])
   };
  }

  function confirme(){
    setModalVisible({ visible:false, modal: null})
    setTimeout(()=> setModalVisible({ visible:true, modal: "ConfirmationModal"}), 1000)
    update()
  }

  const _daccord = () => {
      setReceiver({'name': null, 'telephoneNumber': null})
      setSomme(0)
      setModalVisible({ visible:false, modal: null})
  }

  const {panel, iconStyle} = styles

  React.useEffect(() => {

    if (route.params?.qrScan) {
      const { name, telephoneNumber } = route.params.qrScan
      setReceiver({
        name,
        telephoneNumber
      });
      setModalVisible({ visible:true, modal: "DialPad"})
    }

     return () => {
       setRefreshing(false)
   };

 }, [route.params?.qrScan]);


 React.useEffect(()=>{

  const cleanup = update()

   const subscription =  DeviceEventEmitter.addListener("walletUpdate", (tokens) => {
       update()
     });

     return () => {
        cleanup
        subscription
        setRefreshing(false)
        setFavorisContact([])
        DeviceEventEmitter.removeAllListeners("walletUpdate")
     }

  }, [refreshToken])

  return(
    <View style={{ flex: 1 }}>
    <View style={{flexDirection:'row', paddingTop: 70, justifyContent:'space-between', alignItems:'center', padding: 10, backgroundColor:'#ee2c51'}}>
      <TouchableOpacity
        onPress={() => navigation.navigate('Account')}
        style={{ marginLeft: 10}}>
        <Ionicons name="person-circle-outline" size={24} color="#fefefe" />
      </TouchableOpacity>
      <TouchableOpacity
        style={{ marginRight: 10}}
        onPress={()=> navigation.navigate('QrCode')}>
          <Ionicons name="qr-code-outline" size={24} color="#fefefe" />
      </TouchableOpacity>
    </View>
      <ScrollView
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => update()}
        />
      }
      showsVerticalScrollIndicator={false}>
        <View style={{backgroundColor: '#ee2c51', height: fullHeight, position: 'absolute', top: -fullHeight, left: 0, right: 0, justifyContent:'center', alignItems:'center'}} />
        <View style={{flex: 1, borderBottomLeftRadius: 5,  borderBottomRightRadius: 5, overflow:'hidden'}}>
        <LinearGradient
          colors={['#ee2c51', '#ff3547']}
          style={{height: 120}}>
          <View style={{ justifyContent:'center', alignItems:'center' }}>
            <Text style={{ marginBottom: 5, color:'white', fontSize: 15, fontFamily:'OutfitSemiBold'}}>Votre solde</Text>
            <Text style={{ fontSize: 24, color:'white', fontWeight:'600', fontFamily:'OutfitBlack'}}>
            {showBalance ?
            <NumericFormat
              value={_formatCurrencyToUSD(userData.balance)}
              displayType={'text'}
              thousandSeparator={","}
              prefix={'$'}
              renderText={(value) => <Text>{value}</Text>}
            />
            : '******' }
            </Text>
          </View>
        </LinearGradient>
        </View>
        <View style={{alignItems:'center', marginBottom: 150}}>
        <View style={[panel, { top: -40}]}>
          <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center', }}>
            <TouchableOpacity
              onPress={()=> navigation.navigate('QrScan', { previousScreen: 'Home'})}
              style={{alignItems:'center'}}>
              <View style={{ height: 28, width: 28}}>
                <Ionicons name="scan-outline" size={30} color="#ee2c51" />
                <View style={{position:'absolute', right: 6, top: 8}}>
                  <Ionicons name="qr-code-outline" size={15} color="#E74C3C" />
                </View>
              </View>
              <Text style={{marginTop: 5, color:'grey', fontSize: 13, fontFamily:'OutfitMedium'}}>QR Scan</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={()=> navigation.navigate('Transfert')}
              style={{alignItems:'center'}}>
              <Image source={require('../../../assets/transfer.png')} style={{ height: 28, width: 28}}/>
              <Text style={{marginTop: 5, color:'grey', fontSize: 13, fontFamily:'OutfitMedium'}}>Transfert</Text>
            </TouchableOpacity>
            <TouchableOpacity
            onPress={()=> navigation.navigate('Payments')}
            style={{alignItems:'center'}}>
              <Image source={require('../../../assets/bill.png')} style={{ height: 28, width: 28}}/>
              <Text style={{marginTop: 5, color:'grey', fontSize: 13, fontFamily:'OutfitMedium'}}>Paiements</Text>
            </TouchableOpacity>
            <TouchableOpacity
            onPress={()=> navigation.navigate('Wallet')}
            style={{alignItems:'center'}}>
              <Image source={require('../../../assets/wallet-icon.png')} style={{ height: 28, width: 28}}/>
              <Text style={{marginTop: 5, color:'grey', fontSize: 13, fontFamily:'OutfitMedium'}}>Portfeuille</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{width:'90%', top: 50}}>
        { userData.status == "unverified" ?
        <TouchableOpacity
          onPress={()=> navigation.navigate('Verification')}
          style={[panel, {position:'relative', padding: 10, width:'100%', marginBottom: 10}]}>
          <View style={{flexDirection:'row', alignItems:'center'}}>
            <Octicons name="unverified" size={22} color="#ff3547" />
            <Text style={{fontSize: 14, marginLeft:5 ,fontWeight:'600', fontFamily:'OutfitMedium'}}>Veuillez vérifier votre identité</Text>
          </View>
        </TouchableOpacity>
        :
        userData.status == "pending" ?
        <TouchableOpacity
          onPress={()=> alert('La vérification peut parfois prendre quelques minutes, mais elle est généralement plus rapide, nous vous informerons par notification une fois terminée. Merci de patienter')}
          style={[panel, {position:'relative', padding: 10, width:'100%', marginBottom: 10}]}>
          <View style={{flexDirection:'row', alignItems:'center'}}>
            <MaterialIcons name="timer" size={22} color="green" />
            <Text style={{fontSize: 13, marginLeft:5 ,fontWeight:'600', fontFamily:'OutfitMedium'}}>Vérifications d'identité est en cours...</Text>
          </View>
        </TouchableOpacity>
        :
        userData.status == "rejected" ?
        <TouchableOpacity
          onPress={()=> navigation.navigate('Verification_rejected')}
          style={[panel, {position:'relative', padding: 10, width:'100%', marginBottom: 10}]}>
          <View style={{flexDirection:'row', alignItems:'center'}}>
            <MaterialIcons name="error" size={22} color="red" />
            <Text style={{fontSize: 13, marginLeft:5 ,fontWeight:'600', fontFamily:'OutfitMedium'}}>Vérifications d'identité rejectée...</Text>
          </View>
        </TouchableOpacity>
        :
        null
        }
          <View style={[panel, {position:'relative', padding: 0, width:'100%', marginBottom: 20}]}>
            <Text style={{fontWeight:'bold', paddingLeft: 15, top: 15, fontFamily:'OutfitMedium'}}>Renvoyer de l'argent à</Text>
            { favorisContact?.length == [] ?
              <View style={{ margin: 20}}>
                <Text style={{marginTop: 5, color:'grey', fontFamily:'OutfitMedium'}}>Aucun favoris</Text>
              </View>
            :
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{marginTop: 20, padding: 15}}
              >
              { favorisContact?.slice(0, 8).map((item)=>  <Renvoie key={item.id.toString()} items={item} setReceiver={setReceiver} setModalVisible={setModalVisible} /> ) }
            </ScrollView>
          }
          </View>

        </View>
        </View>
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible.visible && modalVisible.modal =="DialPad"}
          onRequestClose={() => {
            // this.closeButtonFunction()
          }}>
          <DialPad
            setSomme={setSomme}
            somme={somme}
            receiver={receiver}
            setModalVisible={setModalVisible}
            confirmation={confirme}
          />
        </Modal>
        <RnModal
          style={{margin: 0, justifyContent: 'flex-end',}}
          deviceWidth={deviceWidth}
          deviceHeight={deviceHeight}
          onSwipeComplete={() => _daccord()}
          swipeDirection="down"
          onBackdropPress={() => _daccord()}
          onBackButtonPress={() => _daccord()}
          isVisible={modalVisible.visible && modalVisible.modal =="ConfirmationModal"}>
            <ConfirmationModal
              confirmation={_daccord}
              data={{
                title:'Transfert Effectué',
                message:`Votre transfert de $${_formatCurrencyToUSD(somme)} sur ${receiver.telephoneNumber} a été effectué avec succèss`
              }}
            />
        </RnModal>
      </ScrollView>
      { isRefreshing && <Loading />}
    </View>
  )
}
