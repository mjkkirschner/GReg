#!groovy
DOCKER_ORG='artifactory.dev.adskengineer.net/autodeskcloud'
DOCKER_REGISTRY='https://artifactory.dev.adskengineer.net/artifactory/docker-local-v2/'
DOCKER_CREDENTIALS='artifactory-deploy-dev'
BUILD_VERSION="0.0.${BUILD_NUMBER}"
SAFE_BRANCH_NAME=BRANCH_NAME.replaceAll('/','-')
DOCKER_TAG=SAFE_BRANCH_NAME + "-${BUILD_VERSION}"
DOCKER_ARGS="DOCKER_ORG=${DOCKER_ORG} DOCKER_TAG=${DOCKER_TAG}"
currentBuild.displayName = DOCKER_TAG

@Library('PSL@master') _

def buildArgs = "${DOCKER_ARGS} BUILD_NAME=${DOCKER_TAG}"

node('cloud&&centos') { timestamps {

    try {

        // pull source, then force cleanup of untracked files and dirs
        stage('Pull source') {
            def git_info = checkout scm
            def gitCommit = git_info["GIT_COMMIT"]
            buildArgs = buildArgs + " BUILD_COMMIT=${gitCommit}"
            sh "git clean -fxd"
        }

        stage('WhiteSource Scan') {
            scan = new ors.security.common_appsec(steps,env)
            scan.run_oast_scan(
                "repo": "vm",
                "branch": env.BRANCH_NAME,
                "mainline": "master",
                "team": "Dynamo",
                "scan_dir": ["${env.WORKSPACE}"],
                "fail_on_oast": "True"
            )
        }

        stage('Checkmarx Scan') {
            timeout(time: 120, unit: 'MINUTES') {
                scan = new ors.security.common_appsec(steps,env)
                scan.run_sast_scan(
                    "repo": "vm",
                    "branch": env.BRANCH_NAME,
                    "mainline": "master",
                    "team": "Dynamo",
                    "scan_dir": env.WORKSPACE,
                    "fail_on_sast_priority": "True",
                    "files_exclude": ".*",
                    "folders_exclude": ".*, test"
                )
            }
        }

        stage('Build') {
            sh "${buildArgs} docker build -t ${DOCKER_ORG}/dynamopm:${DOCKER_TAG} ${DOCKER_ARGS} ."
        }

        stage('Test') {
            sh "npm run test"
            cobertura(
                coberturaReportFile: "coverage.xml",
                lineCoverageTargets: "30,30,0"
            )
        }

        stage('Docker Push') {
            try {
                docker.withRegistry(DOCKER_REGISTRY, DOCKER_CREDENTIALS) {
                    sh "${DOCKER_ARGS} docker push ${DOCKER_ORG}/dynamopm:${DOCKER_TAG}"
                }
            } finally {
                stage("Cleanup docker image") {
                    sh "${DOCKER_ARGS} docker rmi --force ${DOCKER_ORG}/dynamopm:${DOCKER_TAG} || true"
                }
            }
        }

        if ("${BRANCH_NAME}" == "master") {
            stage("Trigger Application CI") {
                build(job: '../dynamopm-app/master', wait: false)
            }
        }
    } catch (e) {
        // If there was an exception thrown, the build failed
        currentBuild.result = "FAILED"
        throw e
    } finally {
        // Success or failure, always send notifications
        notifyBuild(currentBuild.result)
    }
}}

def notifyBuild(String buildStatus) {
    // build status of null means successful
    buildStatus =  buildStatus ?: 'SUCCESS'

    // Determine color based on build status.
    // These values provide good discrimination for common color blindness types.
    // source: http://mkweb.bcgsc.ca/biovis2012
    def colorCode = '#24FF24'

    if (buildStatus == 'FAILURE') {
        colorCode = '#920000'
    }

    withCredentials([[$class: 'StringBinding', credentialsId: 'slack-notify-token', variable: 'mytoken']]) {
        slackSend (color: colorCode, teamDomain: 'autodesk', token: env.mytoken,
            message: "${buildStatus}: Job ${JOB_NAME} [${BUILD_NUMBER}] (<${BUILD_URL}|Build Data>)",
            channel: '#dynamo-notify')
    }
}