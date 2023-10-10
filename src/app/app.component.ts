import { Component, OnInit } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { AuthService } from './../auth/auth.service';
import { Router } from '@angular/router';
import { ServiceProvider } from '../service-provider/service-provider';
import { AppStorage } from '../shared/app-storage';
import * as model from '../shared/models';
import { NotificationsService } from 'angular2-notifications';
import { NgxUiLoaderService } from 'ngx-ui-loader'
import { WebSocketService } from '../shared/services/web-socket.service';
import { ChatMessageModel } from '../shared/models';
import { AppConfig } from '../app.config';
import { TranslateService } from '@ngx-translate/core';
import { AuditTrailModel } from '../shared/models/AuditTrailModel';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  loginForm: UntypedFormGroup;
  private formSubmitAttempt: boolean;
  public isErrorMsg: boolean = false;
  public isInternetConnection: boolean=false;
  public isSuccessMsg: boolean = false;
  public isIncorrectCredentials: boolean = false;
  public showReset :boolean = false ;
  public userName :any;
  public userData : any;
  public userSettingModels: model.UserSettingModel = {};
  public isLoading: boolean = false;
  public notificationVal = AppConfig.notificationData();
  defultProjectLoad:boolean = false;
  defultClientLoad:boolean = false;
  userDeactivated:boolean = false;
  planExpired:boolean = false;
  isVisible: boolean= false;  
  auditTrail: AuditTrailModel = {};
  userId:any;
  userMailId:any;
  loginAction:any;
  loginStatus:any;
  constructor(
    private webSocketService: WebSocketService,
    private fb: UntypedFormBuilder,
    private authService: AuthService,
    private router: Router,
    private serviceProvider: ServiceProvider,public notify:NotificationsService,private ngxLoader: NgxUiLoaderService,public translate: TranslateService
  ) {
    translate.setDefaultLang('en');
  }
  ngOnInit() {
    this.loginForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });
    let loginValue = JSON.parse(localStorage.getItem('formValue'));
    if(!!loginValue){
    this.loginForm.get('username').setValue(loginValue.username)
    this.loginForm.get('password').setValue(loginValue.password)
    }
  }

  isFieldInvalid(field: string) {
    return (
      (!this.loginForm.get(field).valid && this.loginForm.get(field).touched) ||
      (this.loginForm.get(field).untouched && this.formSubmitAttempt)
    );
  }

  // onSubmit() {
  //   if (this.loginForm.valid) {
  //     this.authService.login(this.loginForm.value);
  //   }
  //   this.formSubmitAttempt = true;
  // }

  onSubmit() {
    localStorage.setItem('formValue',JSON.stringify(this.loginForm.value))
    localStorage.setItem('teamSratistics',JSON.stringify(['#5fb85f','#c74552','#D2CCC1']))
    localStorage.setItem('projectSratistics',JSON.stringify(['#5fb85f','#c74552','#D2CCC1']))
    localStorage.setItem('platformReportColor',JSON.stringify(['#5fb85f', '#D2CCC1', '#c74552']))
    localStorage.setItem('passingRateReportColor',JSON.stringify(['#5fb85f','#c74552']))
    localStorage.setItem('velocityReportColor',JSON.stringify(['#5fb85f','#c74552','#D2CCC1','#0000FF']))
    localStorage.setItem('releasebasedTestcasecount',JSON.stringify(['#c74552','#5fb85f',{'number':10}]))
    localStorage.setItem('timeLineModulary',JSON.stringify(['#FFFF00','#c74552']))
    localStorage.setItem('agentsExecutionChart',JSON.stringify(['#5fb85f','#c74552','#D2CCC1']))
    localStorage.setItem('mostFailedStatusColor',JSON.stringify(['#c74552','#D2CCC1','#00FF00']))
    localStorage.setItem('excutionType', 'AUTOMATION_EXECUTION');
    localStorage.setItem('browserStackColor',JSON.stringify(['#5fb85f','#c74552','#D2CCC1']))
    let data = {}; 
    this.ngxLoader.start() 
    data['username'] = this.loginForm.controls['username'].value;
    data['password'] = this.loginForm.controls['password'].value;
    this.serviceProvider.login(JSON.stringify(data)).subscribe(
      result => {
        if(!!result){
          this.loginAction = 'PASSED';
          this.loginStatus = 'Logged in Successfully';
        this.loadUserByUserName(data);
        this.ngxLoader.stop(); 
        AppStorage.setItem('token', result.headers.get('Authorization'));
         }
      },
      err => {
        this.loginAction = 'FAILED';
        this.loginStatus = err.status+' '+err.msg;
        this.userId = 'UNDEFINED';
        this.userMailId = this.loginForm.controls['username'].value
        this.saveAuditTrail();
        this.notificationMsg();
        this.ngxLoader.stop(); 
        if(err.status === 401){
          this.isIncorrectCredentials = true;
          this.showReset = true;
          // if(!!data['username']){
          //   let userName  = data['username']
          //   this.getUrlData(userName)
          // }
        } 
        else if(err.status === 403){
          this.userDeactivated = true;
        }
        else if(err.status === 426){
          this.planExpired = true;
        }else if(err.status === 0 ){
          this.isInternetConnection = true;
        }else if(err.status === 500) {
          this.isErrorMsg = true;
        }
      },
      () => { 
      }
  );
  }
  loadUserByUserName(obj){
    this.serviceProvider.getList('/users/loadUser?username='+obj.username).subscribe(
      result => {
        if(!!result){
          this.userId = result.id;
          this.userMailId = result.userName;
          this.saveAuditTrail();
          //  this.loadDefaultClient(result.defaultClientId);
          // this.loadDefaultProject(result.defaultProjectId);
          this.getClientDataByClientId(result);
          AppStorage.setItem('userId', result.id);
          AppStorage.setItem('name', result.name);
          AppStorage.setItem('userName',result.username)
          AppStorage.setItem('defaultLanguage',result.defaultLanguage);
          AppStorage.setItem('clientId',!!result.defaultClientId ?result.defaultClientId :null)
          AppStorage.setItem('projectId',!!result.defaultProjectId ? result.defaultProjectId:null)
          if(!!result.isBillingPermission){
          AppStorage.setItem('isBillingPermission', result.isBillingPermission)
          }
          if(!!result.isAllowSMTPConfiguration){
            AppStorage.setItem('isAllowSMTPConfiguration', result.isAllowSMTPConfiguration)
            }
          AppStorage.setItem('department',!!result.departments ? JSON.stringify(result.departments):null)
          // if(result.roleIds !== null && !!result.roleIds[0]){
          //   AppStorage.setItem('roleId', result.roleIds[0]);
          //   this.loadUserRoleData(result.roleIds[0]);
          // }else{
          //   this.router.navigate(['/']);
          // }
          // if(!!this.defultClientLoad && !!this.defultProjectLoad){
          // this.router.navigate(['/']);
          this.notificationMsg();
          
          this.webSocketService.joinChatService(result.id);
          
          this.isSuccessMsg = true;
          if(!!result.userType){
            AppStorage.setItem('userType', result.userType);
          }
          // this.getUserProfileData();
          this.updateLastLoginTime(result.username);
        // }
        }
        },
      err => {
        this.loginAction = 'FAILED';
        this.loginStatus = err.status+' '+err.msg;
        this.userId = 'UNDEFINED';
        this.userMailId = this.loginForm.controls['username'].value
        this.saveAuditTrail();
        this.notificationMsg();
        this.isErrorMsg = true;
        this.isInternetConnection=true;
    });
  }

  updateLastLoginTime(userId){
    this.serviceProvider.lastLoggedTime(userId).subscribe(
      result => {
       },
      err => {
    });  
  }

  // loadUserRoleData(roleId){
  //   this.serviceProvider.getList('/role/role/'+roleId).subscribe(
  //     result => {        
  //       if(!!result){
  //         AppStorage.setItem('permissions', JSON.stringify(result.permissions));
  //         AppStorage.setItem('roleName', result.name);
  //         this.router.navigate(['/']);
  //       }
  //       },
  //     err => {
  //   });
  // }

  notificationMsg() {
    setTimeout( () => {
      this.isErrorMsg = false;
      this.isInternetConnection=false;
      this.isSuccessMsg = false;
      this.isIncorrectCredentials = false;
      this.userDeactivated = false;
      this.planExpired = false;
    }, 3000);
  }
  
  signUp() {
    this.router.navigateByUrl('/sign-up');
  }

  enquiry() {
    this.router.navigateByUrl('/enquiry');
  }

  getUserName(obj) {
     if (!!obj.username) {
     this.showReset = true;
     this.userName = obj.username
     this.getUrlData(obj.username)
    } 
  }

  getUrlData(username) {
    this.serviceProvider.getList('/users/loadUser?username='+username).subscribe(res=>{
        if (res) {
          this.userData = res;
          if(!!this.userData){
            this.onPressReset()
          }
        }
    })
  }

  onPressReset() {
    if (!this.userData) {
      this.notify.error('This user does not exists..!', null, this.notificationVal[0]);
    } else {
    this.userSettingModels = this.userData;
    // this.userSettingModels['name'] = this.userData.name;
    // this.userSettingModels['emailAddress'] = this.userData.emailAddress;
    // this.userSettingModels['username'] = this.userName;
    // this.userSettingModels['password'] = this.userData.password;
    // this.userSettingModels['mobileNo'] = this.userData.mobileNo;
    // this.userSettingModels['roleIds'] = this.userData.roleIds;
    this.userSettingModels['sendOtp'] = true;
    
    this.serviceProvider.createUserSetting(JSON.stringify(this.userSettingModels)).subscribe(
      result => {
         if(!!result){
           this.notify.success('OTP has sent Successfully..!', null, this.notificationVal[0]);
           }
      },
      err => {
        this.notify.error('Internal Server Error..!', null, this.notificationVal[0]);
       },
      () => {
      }
  );  
    this.router.navigateByUrl(`/otp/${this.userName}`)
  }
}

  // getUserProfileData() {
  //   const userId =  AppStorage.getItem('userId')
  //    this.serviceProvider.getList('/users/user-profile?u='+userId).subscribe(
  //      result => {
  //        if(!!result.dateFormat){
  //         AppStorage.setItem('dateFormat', result.dateFormat);
  //        }
  //    })
  //  }

  // loadDefaultProject(defultProjectId){
  //   this.serviceProvider.getList('/config/project/' + defultProjectId).subscribe(
  //     result => {
  //       if (!!result) {
  //         this.defultProjectLoad = true
  //         AppStorage.setItem('projectName',result.projectName)
  //         // this.searchForm.controls['searchProject'] = result.projectName
  //         // this.onProjectClick(result, null)
  //       }
  //     },
  //     err => {
  //       this.defultProjectLoad = true
  //     });
  // }

  // loadDefaultClient(defultClientId){
  //   this.serviceProvider.getList('/client/client/' +defultClientId).subscribe(
  //     result => {
  //       if (!!result) {
  //         this.defultClientLoad = true;
  //         AppStorage.setItem('clientName',result.clientName)
  //         // this.searchForm.controls['searchClient'] = result.clientName
  //         // this.clientChange(result, null)
  //       }
  //     },
  //     err => {
  //       this.defultClientLoad = true;
  //     });
  // }

  getClientDataByClientId(data) {
    if (!!data.defaultClientId) {
      this.serviceProvider.getList('/client/client/' + data.defaultClientId).subscribe(
        result => {
          if (!!result) {
            AppStorage.setItem('clientName', result.clientName)
            this.router.navigate(['/home']);
          } else {
            this.router.navigate(['/home']);
          }
        },
        err => {
        },
      )
    } else {
      this.router.navigate(['/home']);
    }
  }
  togglePassword()
{
  this.isVisible=!this.isVisible;
}

getUserDataByName() {
  this.userName = this.loginForm.controls['username'].value;
  if (!!this.userName) {
   this.showReset = true;    
   this.getUrlData(this.userName)
  } 
}

saveAuditTrail(){
this.auditTrail = {};
this.auditTrail.actions = this.loginAction;
this.auditTrail.auditId = this.userId;
this.auditTrail.auditName = this.userMailId;
this.auditTrail.comment = this.loginStatus;
this.auditTrail.id = null;
this.auditTrail.type = 'USER';
this.auditTrail.subType = 'LOGGED_IN';

this.serviceProvider.auditTrail([this.auditTrail]).subscribe(
  result =>{
     // if(!!result){
     //  }
     },
   err=>{
 })
}
}