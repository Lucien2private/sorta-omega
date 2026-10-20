import { chromium, type Browser, type Page, type Request, type Response } from "playwright-core";
import { link, mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { inSchoolTimetableSnapshot,teamsNotes,type InSchoolVisibleLesson } from "./normalize.js";
import { collectTeamsAssignments } from "./teams-assignments.js";
import { collectInSchoolAttendance } from "./inschool-attendance.js";
import { collectInSchoolAssessments } from "./inschool-assessments.js";
import { collectTeamsClassPosts } from "./teams-channels.js";
import { collectTeamsChats } from "./teams-chats.js";
import { collectTeamsPowerpoints } from "./teams-powerpoints.js";
import { collectTeamsAssignmentFiles } from "./teams-assignment-files.js";
import { missingSchoolTabError } from "./school-session.js";
import type { TeamsAssignmentSnapshot } from "./teams-assignments.js";

const args=new Map<string,string>();for(let index=2;index<process.argv.length;index+=2){const key=process.argv[index],value=process.argv[index+1];if(!key?.startsWith("--")||!value)throw new Error("usage: browser-bridge --provider teams|inschool --output <absolute-json-file> [--origin https://county.inschool.visma.no] (--profile <absolute-directory> OR --cdp http://127.0.0.1:9222 OR --cdp-profile <absolute-directory> --noninteractive true)");args.set(key.slice(2),value);}
const provider=args.get("provider"),profile=args.get("profile"),cdpProfile=args.get("cdp-profile"),destination=args.get("output"),noninteractive=args.get("noninteractive")==="true";
function boundedWeeks(name:string,defaultValue:number,max:number){const raw=args.get(name);if(raw===undefined)return defaultValue;if(!/^\d{1,2}$/.test(raw))throw new Error(`${name}_must_be_bounded_integer`);const value=Number(raw);if(value>max)throw new Error(`${name}_must_be_bounded_integer`);return value;}
const weeksPast=boundedWeeks("weeks-past",2,52),weeksFuture=boundedWeeks("weeks-future",16,24),startOffsetWeeks=boundedWeeks("start-offset-weeks",0,52);
let cdp=args.get("cdp");
if(!["teams","teams-assignments","teams-assignment-files","teams-channels","teams-chats","teams-powerpoints","inschool","inschool-attendance","inschool-assessments"].includes(provider??"")||!destination||!path.isAbsolute(destination)||(!profile&&!cdp&&!cdpProfile)||profile&&!path.isAbsolute(profile)||cdpProfile&&!path.isAbsolute(cdpProfile)||cdp&&cdpProfile)throw new Error("browser_bridge_requires_provider_and_absolute_output_plus_profile_or_cdp");
if(cdpProfile){const [portText,socketPath]=(await readFile(path.join(cdpProfile,"DevToolsActivePort"),"utf8")).trim().split(/\r?\n/),port=Number(portText);if(!Number.isInteger(port)||port<1024||port>65535||!/^\/devtools\/browser\/[a-zA-Z0-9-]+$/.test(socketPath??""))throw new Error("browser_bridge_cdp_profile_port_invalid");cdp=`ws://127.0.0.1:${port}${socketPath}`;}
if(cdp){const url=new URL(cdp);if(!["http:","ws:"].includes(url.protocol)||!["127.0.0.1","localhost"].includes(url.hostname)||url.username||url.password||url.search||url.hash||url.protocol==="http:"&&url.pathname!=="/"||url.protocol==="ws:"&&!/^\/devtools\/browser\/[a-zA-Z0-9-]+$/.test(url.pathname))throw new Error("browser_bridge_cdp_must_be_local_loopback");}
if(noninteractive&&!cdp)throw new Error("browser_bridge_noninteractive_requires_attached_browser");
const artifactPath=path.resolve(destination);if(path.extname(artifactPath).toLowerCase()!==".json")throw new Error("browser_bridge_output_must_be_json");
for(const root of [profile,cdpProfile].filter((value):value is string=>Boolean(value))){const profileRoot=path.resolve(root),relativeToProfile=path.relative(profileRoot,artifactPath);if(relativeToProfile===""||!relativeToProfile.startsWith("..")&&!path.isAbsolute(relativeToProfile))throw new Error("browser_bridge_output_must_be_outside_profile");}

async function writeNewArtifact(value:unknown){await mkdir(path.dirname(artifactPath),{recursive:true});const temporary=`${artifactPath}.${process.pid}.tmp`;await writeFile(temporary,`${JSON.stringify(value,null,2)}\n`,{flag:"wx"});try{await link(temporary,artifactPath);}finally{await unlink(temporary).catch(()=>undefined);}}

function assertAllowed(page:Page){const url=new URL(page.url());if(url.protocol!=="https:")throw new Error("browser_bridge_https_required");if(provider?.startsWith("teams")&&!['teams.microsoft.com','teams.cloud.microsoft'].includes(url.hostname))throw new Error("teams_navigation_left_registered_origin");if(provider?.startsWith("inschool")&&!url.hostname.endsWith(".inschool.visma.no"))throw new Error("inschool_navigation_left_registered_origin");}

function isoWeek(unixText:string){const unix=Number(unixText);if(!Number.isSafeInteger(unix))return null;const local=new Intl.DateTimeFormat("sv-SE",{timeZone:"Europe/Oslo",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(unix*1000));const date=new Date(`${local}T00:00:00Z`);date.setUTCDate(date.getUTCDate()+4-(date.getUTCDay()||7));const start=new Date(Date.UTC(date.getUTCFullYear(),0,1));return Math.ceil(((date.getTime()-start.getTime())/86_400_000+1)/7);}

async function visibleInSchoolWeek(page:Page){
  const heading=(await page.locator(".userTimetable_currentWeek").textContent())?.trim()??"";
  const match=/\bUke\s+(\d{1,2})\b/i.exec(heading);if(!match)throw new Error("inschool_week_heading_not_recognized_layout_review_required");
  const expectedWeek=Number(match[1]);
  for(let attempt=0;attempt<40;attempt++){
    const items=await page.evaluate(String.raw`(() => [...document.querySelectorAll('.Timetable-TimetableItem[starttimeanddateunix]')].map(element => ({
      entityId: element.getAttribute('entityid') ?? '',
      teachingGroupId: element.getAttribute('teachinggroupid') ?? '',
      startUnix: element.getAttribute('starttimeanddateunix') ?? '',
      hours: element.querySelector('.Timetable-TimetableItem-hours')?.textContent ?? '',
      subjectCode: element.getAttribute('subjectcode') ?? '',
      subjectName: element.querySelector('.Timetable-TimetableItem-subject-name')?.textContent ?? '',
      room: element.querySelector('.Timetable-TimetableItem-location')?.textContent ?? '',
      teachers: element.querySelector('.Timetable-TimetableItem-teachers')?.textContent ?? '',
      lessonType: element.getAttribute('tttype') ?? '',
    })))()` ) as InSchoolVisibleLesson[];
    if(items.length&&items.every(item=>isoWeek(item.startUnix)===expectedWeek))return{heading,items};
    if(!items.length&&attempt>=3)return{heading,items};
    await page.waitForTimeout(250);
  }
  throw new Error("inschool_week_lessons_not_loaded_or_date_mismatch");
}

async function moveInSchoolWeek(page:Page,direction:-1|1){
  const previous=(await page.locator(".userTimetable_currentWeek").textContent())?.trim();
  const label=direction===1?"Neste uke":"Forrige uke";
  const control=page.locator(`button.userTimetable_moveWeekButton[aria-label="${label}"]`);
  if(await control.count()!==1||await control.isDisabled())throw new Error("inschool_week_navigation_changed_or_unavailable");
  const origin=new URL(page.url()).origin;
  const isTimetableRequest=(request:Request)=>{try{const url=new URL(request.url());return url.origin===origin&&request.resourceType()==="xhr"&&/^\/control\/.*\/learner\/.*\/fetch\/ALL\/.*\/current$/.test(url.pathname);}catch{return false;}};
  const pending=new Set<Request>();let observed=false,failed=false,lastFinished=0;
  const onRequest=(request:Request)=>{if(isTimetableRequest(request)){observed=true;pending.add(request);}};
  const onFinished=(request:Request)=>{if(isTimetableRequest(request)){pending.delete(request);lastFinished=Date.now();}};
  const onFailed=(request:Request)=>{if(isTimetableRequest(request)){pending.delete(request);failed=true;}};
  const onResponse=(response:Response)=>{if(isTimetableRequest(response.request())&&response.status()>=400)failed=true;};
  page.on("request",onRequest);page.on("requestfinished",onFinished);page.on("requestfailed",onFailed);page.on("response",onResponse);
  try{
    await control.click();
    await page.waitForFunction(before=>{const current=document.querySelector(".userTimetable_currentWeek")?.textContent?.trim();return Boolean(current&&current!==before);},previous,{timeout:15_000});
    assertAllowed(page);
    for(let attempt=0;attempt<80;attempt++){
      if(failed)throw new Error("inschool_timetable_request_failed");
      if(observed&&pending.size===0&&Date.now()-lastFinished>=750)return;
      await page.waitForTimeout(250);
    }
    throw new Error("inschool_timetable_request_not_completed");
  }finally{page.off("request",onRequest);page.off("requestfinished",onFinished);page.off("requestfailed",onFailed);page.off("response",onResponse);}
}

async function scrollToOldest(page:Page){for(let attempt=0,stable=0,previous="";attempt<200&&stable<4;attempt++){const state=await page.evaluate(()=>{const candidates=[...document.querySelectorAll<HTMLElement>('[data-tid="message-pane-list-runway"], [role="log"], [data-tid="chat-pane-list"]')],target=candidates.sort((a,b)=>b.scrollHeight-a.scrollHeight)[0];if(!target)return"missing";target.scrollTop=0;return`${target.scrollHeight}:${target.textContent?.slice(0,200)??""}`;});stable=state===previous?stable+1:0;previous=state;await page.waitForTimeout(750);}}

const browser:Browser|null=cdp?await chromium.connectOverCDP(cdp).catch(()=>{throw new Error("browser_bridge_cdp_connection_failed");}):null;
const context=browser?browser.contexts()[0]:await chromium.launchPersistentContext(path.resolve(profile!),{channel:"msedge",headless:false,acceptDownloads:false,args:["--disable-features=PasswordLeakDetection"]});
if(!context){await browser?.close();throw new Error("browser_bridge_cdp_context_not_found");}
const pages=context.pages(),existing=cdp?pages.find(candidate=>{try{const url=new URL(candidate.url());return provider?.startsWith("teams")?['teams.microsoft.com','teams.cloud.microsoft'].includes(url.hostname):url.hostname.endsWith(".inschool.visma.no");}catch{return false;}}):null;
const terminal=createInterface({input,output});
try{
  if(cdp&&!existing)throw new Error(missingSchoolTabError(provider!,pages.map(candidate=>candidate.url())));
  const page=existing??pages[0]??await context.newPage();
  if(provider==="teams-powerpoints"){
    assertAllowed(page);
    if(path.basename(artifactPath)!=="manifest.json"||!/^personal-[0-9a-f]{32}$/.test(path.basename(path.dirname(artifactPath))))throw new Error("teams_powerpoint_output_directory_invalid");
    const requestedClass=args.get("class-index");
    if(requestedClass!==undefined&&!/^\d{1,2}$/.test(requestedClass))throw new Error("teams_class_index_invalid");
    const {manifest,report}=await collectTeamsPowerpoints(page,path.dirname(artifactPath),requestedClass===undefined?undefined:Number(requestedClass));
    await writeNewArtifact(manifest);
    console.log(JSON.stringify({provider,format:manifest.version,itemCount:manifest.items.length,output:artifactPath,...report,sessionRetainedInProfile:true,credentialsExported:false}));
  }else if(provider==="teams-assignment-files"){
    assertAllowed(page);
    if(path.basename(artifactPath)!=="manifest.json"||!/^personal-[0-9a-f]{32}$/.test(path.basename(path.dirname(artifactPath))))throw new Error("teams_assignment_files_output_directory_invalid");
    const basePath=args.get("base-snapshot");
    if(!basePath||!path.isAbsolute(basePath)||path.resolve(basePath)===artifactPath)throw new Error("teams_assignment_files_base_snapshot_required");
    const requestedRecord=args.get("assignment-record-index");
    if(requestedRecord!==undefined&&!/^\d{1,3}$/.test(requestedRecord))throw new Error("teams_assignment_files_record_index_invalid");
    const snapshot=JSON.parse(await readFile(basePath,"utf8")) as TeamsAssignmentSnapshot;
    const {manifest,report}=await collectTeamsAssignmentFiles(page,snapshot,path.dirname(artifactPath),requestedRecord===undefined?undefined:Number(requestedRecord));
    await writeNewArtifact(manifest);
    console.log(JSON.stringify({provider,format:manifest.version,itemCount:manifest.items.length,output:artifactPath,...report,sessionRetainedInProfile:true,credentialsExported:false}));
  }else if(provider==="teams-chats"){
    assertAllowed(page);
    const { notes, coverage } = await collectTeamsChats(page);
    await writeNewArtifact(notes);
    console.log(JSON.stringify({provider,format:"omega_notes_json_v1",itemCount:notes.length,output:artifactPath,coverage,sessionRetainedInProfile:true,credentialsExported:false,liveConnectionCreated:false}));
  }else if(provider==="teams-channels"){
    assertAllowed(page);
    const { notes, coverage } = await collectTeamsClassPosts(page);
    await writeNewArtifact(notes);
    console.log(JSON.stringify({provider,format:"omega_notes_json_v1",itemCount:notes.length,output:artifactPath,coverage,sessionRetainedInProfile:true,credentialsExported:false,liveConnectionCreated:false}));
  }else if(provider==="teams-assignments"){
    if(!cdp)await page.goto("https://teams.microsoft.com/",{waitUntil:"domcontentloaded"});
    if(!noninteractive)await terminal.question("Sign in interactively if needed, then press Enter to capture the Teams Assignments list. ");
    assertAllowed(page);
    const snapshot=await collectTeamsAssignments(page);
    await writeNewArtifact(snapshot);
    console.log(JSON.stringify({provider,format:snapshot.version,itemCount:snapshot.records.length,output:artifactPath,sessionRetainedInProfile:true,credentialsExported:false,liveConnectionCreated:false,coverageComplete:snapshot.coverage.complete,coverageLimitation:snapshot.coverage.limitation}));
  }else if(provider==="teams"){
    if(!cdp)await page.goto("https://teams.microsoft.com/",{waitUntil:"domcontentloaded"});
    if(!noninteractive)await terminal.question("Sign in interactively if needed, open the exact chat or channel you want to export, then press Enter here. ");assertAllowed(page);await scrollToOldest(page);
    const selectors=['[data-tid="chat-pane-message"]','[data-tid="message-pane-list-runway"] [role="listitem"]','[role="log"] [role="listitem"]'];let texts:string[]=[];for(const selector of selectors){texts=await page.locator(selector).allTextContents();if(texts.length)break;}if(!texts.length)throw new Error("teams_message_elements_not_found_layout_review_required");const capturedAt=new Date().toISOString(),notes=teamsNotes(texts,capturedAt);await writeNewArtifact(notes);console.log(JSON.stringify({provider:"teams",format:"omega_notes_json_v1",visibleElementCount:texts.length,itemCount:notes.length,itemLimit:500,output:artifactPath,sessionRetainedInProfile:true,credentialsExported:false,liveConnectionCreated:false,coverageLimitation:texts.length>500?"At most 500 normalized visible messages are exported per snapshot.":null}));
  }else{
    const origin=new URL(args.get("origin")??"");if(origin.protocol!=="https:"||!origin.hostname.endsWith(".inschool.visma.no")||origin.username||origin.password)throw new Error("registered_inschool_origin_required");if(!cdp)await page.goto(origin.origin,{waitUntil:"domcontentloaded"});
    const timetablePage=cdp?await context.newPage():page;
    try{
    if(provider==="inschool-assessments"){
      const basePath=args.get("base-snapshot");
      if(!basePath||!path.isAbsolute(basePath)||path.resolve(basePath)===artifactPath)throw new Error("inschool_assessment_base_snapshot_required");
      const base=JSON.parse(await readFile(basePath,"utf8"));
      if(!cdp)await timetablePage.goto(`${origin.origin}/#/app/dashboard`,{waitUntil:"domcontentloaded",timeout:30_000});
      assertAllowed(page);
      if(new URL(page.url()).origin!==origin.origin)throw new Error("inschool_tab_origin_does_not_match_registered_origin");
      const {snapshot,coverage}=await collectInSchoolAssessments(page,base,origin.origin);
      await writeNewArtifact(snapshot);
      console.log(JSON.stringify({provider,format:snapshot.version,output:artifactPath,itemCount:snapshot.records.length,coverage,sessionRetainedInProfile:true,credentialsExported:false}));
    }else if(provider==="inschool-attendance"){
      const basePath=args.get("base-snapshot");
      if(!basePath||!path.isAbsolute(basePath)||path.resolve(basePath)===artifactPath)throw new Error("inschool_attendance_base_snapshot_required");
      const base=JSON.parse(await readFile(basePath,"utf8"));
      if(base.version!=="omega_school_json_v1"||base.source_origin!==origin.origin||!Array.isArray(base.records))throw new Error("inschool_attendance_base_snapshot_invalid");
      await timetablePage.goto(`${origin.origin}/#/app/attendance/lessons`,{waitUntil:"domcontentloaded",timeout:30_000});
      assertAllowed(timetablePage);
      if(new URL(timetablePage.url()).origin!==origin.origin)throw new Error("inschool_tab_origin_does_not_match_registered_origin");
      const {snapshot,coverage}=await collectInSchoolAttendance(timetablePage,base,origin.origin);
      if(!snapshot.records.some(record=>record.kind==="attendance")){console.log(JSON.stringify({provider,coverage,baseCourses:base.records.filter((record:{kind:string})=>record.kind==="course").map((record:{teachingGroupId?:string,title?:string})=>({group:record.teachingGroupId,title:record.title})).slice(0,25),baseSubjects:base.records.filter((record:{kind:string})=>record.kind==="subject").map((record:{code?:string,title?:string})=>({code:record.code,title:record.title})).slice(0,25)}));throw new Error("inschool_attendance_no_mapped_records");}
      await writeNewArtifact(snapshot);
      console.log(JSON.stringify({provider,format:snapshot.version,output:artifactPath,itemCount:snapshot.records.length,coverage,sessionRetainedInProfile:true,credentialsExported:false}));
    }else{
    if(cdp)await timetablePage.goto(`${origin.origin}/#/app/dashboard`,{waitUntil:"domcontentloaded",timeout:30_000});
    if(!noninteractive)await terminal.question("Sign in through Feide interactively if needed, open the timetable, then press Enter here. ");
    assertAllowed(timetablePage);
    if(new URL(timetablePage.url()).origin!==origin.origin)throw new Error("inschool_tab_origin_does_not_match_registered_origin");
    if(new URL(timetablePage.url()).pathname.toLowerCase().endsWith("/login.jsp"))throw new Error("inschool_login_required");
    await timetablePage.locator(".userTimetable_currentWeek").waitFor({timeout:25_000}).catch(()=>{throw new Error("inschool_timetable_not_open_layout_review_required");});
    if(await timetablePage.locator(".userTimetable_currentWeek").count()!==1)throw new Error("inschool_timetable_not_open_layout_review_required");
    const items:InSchoolVisibleLesson[]=[];const visitedWeeks:string[]=[];let offset=0;
    try{
      const collect=async()=>{const week=await visibleInSchoolWeek(timetablePage);visitedWeeks.push(week.heading);items.push(...week.items);};
      for(let index=0;index<startOffsetWeeks;index++){await moveInSchoolWeek(timetablePage,1);offset++;}
      await collect();
      for(let index=0;index<weeksPast;index++){await moveInSchoolWeek(timetablePage,-1);offset--;await collect();}
      for(let index=0;index<weeksPast+weeksFuture;index++){await moveInSchoolWeek(timetablePage,1);offset++;await collect();}
    }finally{
      if(!cdp){while(offset>0){await moveInSchoolWeek(timetablePage,-1);offset--;}while(offset<0){await moveInSchoolWeek(timetablePage,1);offset++;}}
    }
    if(!items.length)throw new Error("inschool_lesson_elements_not_found_layout_review_required");
    const uniqueItems=[...new Map(items.map(item=>[`${item.entityId}:${item.teachingGroupId}:${item.startUnix}:${item.lessonType}`,item])).values()];
    const capturedAt=new Date().toISOString(),snapshot={...inSchoolTimetableSnapshot(items,capturedAt),source_origin:origin.origin};
    if(!snapshot.records.some(record=>record.kind==="lesson"))throw new Error("inschool_lesson_times_not_parsed_layout_review_required");
    await writeNewArtifact(snapshot);
    console.log(JSON.stringify({provider:"inschool",format:"omega_school_json_v1",startOffsetWeeks,visitedWeekCount:visitedWeeks.length,distinctWeekCount:new Set(visitedWeeks).size,visibleElementCount:items.length,uniqueLessonCount:uniqueItems.length,itemCount:snapshot.records.length,itemLimit:2500,output:artifactPath,sessionRetainedInProfile:true,credentialsExported:false,liveConnectionCreated:false,coverageLimitation:`This capture starts ${startOffsetWeeks} week(s) from the current timetable week and covers ${weeksPast} week(s) before and ${weeksFuture} week(s) after it. Absence and grade details are not yet included.`}));
    }
    }finally{if(cdp)await timetablePage.close();}
  }
}catch(caught){const message=caught instanceof Error?caught.message:"";const sized=/^(teams_powerpoint_(?:file|batch)_limit_exceeded):(\d+)$/.exec(message);console.log(JSON.stringify({provider,errorCode:sized?.[1]??(/^[a-z0-9_]{1,100}$/.test(message)?message:"browser_bridge_failed"),...(sized?{byteLength:Number(sized[2])}:{})}));process.exitCode=1;}finally{terminal.close();if(browser)await browser.close();else await context.close();}
